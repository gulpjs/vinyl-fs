'use strict';

var util = require('util');

var fs = require('graceful-fs');
var path = require('path');
var assign = require('object-assign');
var date = require('value-or-function').date;
var FlushWriteStream = require('flush-write-stream');

var constants = require('./constants');

var APPEND_MODE_REGEXP = /a/;

function closeFd(propagatedErr, fd, callback) {
  if (typeof fd !== 'number') {
    return callback(propagatedErr);
  }

  fs.close(fd, onClosed);

  function onClosed(closeErr) {
    if (propagatedErr || closeErr) {
      return callback(propagatedErr || closeErr);
    }

    callback();
  }
}

function isValidUnixId(id) {
  if (typeof id !== 'number') {
    return false;
  }

  if (id < 0) {
    return false;
  }

  return true;
}

function getModeDiff(fsMode, vinylMode) {
  var modeDiff = 0;

  if (typeof vinylMode === 'number') {
    modeDiff = (vinylMode ^ fsMode) & constants.MASK_MODE;
  }

  return modeDiff;
}

function getTimesDiff(fsStat, vinylStat) {

  var mtime = date(vinylStat.mtime);
  if (!mtime) {
    return;
  }

  var atime = date(vinylStat.atime);
  if (+mtime === +fsStat.mtime &&
      +atime === +fsStat.atime) {
    return;
  }

  if (!atime) {
    atime = date(fsStat.atime) || undefined;
  }

  var timesDiff = {
    mtime: vinylStat.mtime,
    atime: atime,
  };

  return timesDiff;
}

function getOwnerDiff(fsStat, vinylStat) {
  if (!isValidUnixId(vinylStat.uid) &&
      !isValidUnixId(vinylStat.gid)) {
    return;
  }

  if ((!isValidUnixId(fsStat.uid) && !isValidUnixId(vinylStat.uid)) ||
      (!isValidUnixId(fsStat.gid) && !isValidUnixId(vinylStat.gid))) {
    return;
  }

  var uid = fsStat.uid; // Default to current uid.
  if (isValidUnixId(vinylStat.uid)) {
    uid = vinylStat.uid;
  }

  var gid = fsStat.gid; // Default to current gid.
  if (isValidUnixId(vinylStat.gid)) {
    gid = vinylStat.gid;
  }

  if (uid === fsStat.uid &&
      gid === fsStat.gid) {
    return;
  }

  var ownerDiff = {
    uid: uid,
    gid: gid,
  };

  return ownerDiff;
}

function isOwner(fsStat) {
  var hasGetuid = (typeof process.getuid === 'function');
  var hasGeteuid = (typeof process.geteuid === 'function');

  // If we don't have either, assume we don't have permissions.
  // This should only happen on Windows.
  // Windows basically noops fchmod and errors on futimes called on directories.
  if (!hasGeteuid && !hasGetuid) {
    return false;
  }

  var uid;
  if (hasGeteuid) {
    uid = process.geteuid();
  } else {
    uid = process.getuid();
  }

  if (fsStat.uid !== uid && uid !== 0) {
    return false;
  }

  return true;
}

function updateMetadata(fd, file, callback) {

  fs.fstat(fd, onStat);

  function onStat(statErr, stat) {
    if (statErr) {
      return callback(statErr);
    }

    // Check if mode needs to be updated
    var modeDiff = getModeDiff(stat.mode, file.stat.mode);

    // Check if atime/mtime need to be updated
    var timesDiff = getTimesDiff(stat, file.stat);

    // Check if uid/gid need to be updated
    var ownerDiff = getOwnerDiff(stat, file.stat);

    // Set file.stat to the reflect current state on disk
    assign(file.stat, stat);

    // Nothing to do
    if (!modeDiff && !timesDiff && !ownerDiff) {
      return callback();
    }

    // Check access, `futimes`, `fchmod` & `fchown` only work if we own
    // the file, or if we are effectively root (`fchown` only when root).
    if (!isOwner(stat)) {
      return callback();
    }

    if (modeDiff) {
      return mode();
    }
    if (timesDiff) {
      return times();
    }
    owner();

    function mode() {
      var mode = stat.mode ^ modeDiff;

      fs.fchmod(fd, mode, onFchmod);

      function onFchmod(fchmodErr) {
        if (!fchmodErr) {
          file.stat.mode = mode;
        }
        if (timesDiff) {
          return times(fchmodErr);
        }
        if (ownerDiff) {
          return owner(fchmodErr);
        }
        callback(fchmodErr);
      }
    }

    function times(propagatedErr) {
      fs.futimes(fd, timesDiff.atime, timesDiff.mtime, onFutimes);

      function onFutimes(futimesErr) {
        if (!futimesErr) {
          file.stat.atime = timesDiff.atime;
          file.stat.mtime = timesDiff.mtime;
        }
        if (ownerDiff) {
          return owner(propagatedErr || futimesErr);
        }
        callback(propagatedErr || futimesErr);
      }
    }

    function owner(propagatedErr) {
      fs.fchown(fd, ownerDiff.uid, ownerDiff.gid, onFchown);

      function onFchown(fchownErr) {
        if (!fchownErr) {
          file.stat.uid = ownerDiff.uid;
          file.stat.gid = ownerDiff.gid;
        }
        callback(propagatedErr || fchownErr);
      }
    }
  }
}

/*
  Custom writeFile implementation because we need access to the
  file descriptor after the write is complete.
  Most of the implementation taken from node core.
 */
function writeFile(filepath, data, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (!Buffer.isBuffer(data)) {
    return callback(new TypeError('Data must be a Buffer'));
  }

  if (!options) {
    options = {};
  }

  // Default the same as node
  var mode = options.mode || constants.DEFAULT_FILE_MODE;
  var flag = options.flag || 'w';
  var position = APPEND_MODE_REGEXP.test(flag) ? null : 0;

  fs.open(filepath, flag, mode, onOpen);

  function onOpen(openErr, fd) {
    if (openErr) {
      return onComplete(openErr);
    }

    fs.write(fd, data, 0, data.length, position, onComplete);

    function onComplete(writeErr) {
      callback(writeErr, fd);
    }
  }
}

function mkdirp(dirpath, customMode, callback) {
  if (typeof customMode === 'function') {
    callback = customMode;
    customMode = undefined;
  }

  var mode = customMode || (constants.DEFAULT_DIR_MODE & ~process.umask());
  dirpath = path.resolve(dirpath);

  fs.mkdir(dirpath, mode, onMkdir);

  function onMkdir(mkdirErr) {
    if (!mkdirErr) {
      return fs.stat(dirpath, onStat);
    }

    switch (mkdirErr.code) {
      case 'ENOENT': {
        return mkdirp(path.dirname(dirpath), onRecurse);
      }

      case 'EEXIST': {
        return fs.stat(dirpath, onStat);
      }

      default: {
        return callback(mkdirErr);
      }
    }

    function onStat(statErr, stats) {
      if (statErr) {
        return callback(statErr);
      }

      if (!stats.isDirectory()) {
        return callback(mkdirErr);
      }

      if (stats.mode === mode) {
        return callback();
      }

      if (!customMode) {
        return callback();
      }

      fs.chmod(dirpath, mode, callback);
    }
  }

  function onRecurse(recurseErr) {
    if (recurseErr) {
      return callback(recurseErr);
    }

    mkdirp(dirpath, mode, callback);
  }
}

function createWriteStream(path, options, flush) {
  return new WriteStream(path, options, flush);
}

// Taken from node core and altered to receive a flush function and simplified
// To be used for cleanup (like updating times/mode/etc)
function WriteStream(path, options, flush) {
  // Not exposed so we can avoid the case where someone doesn't use `new`

  if (typeof options === 'function') {
    flush = options;
    options = null;
  }

  options = options || {};

  FlushWriteStream.call(this, options, worker, cleanup);

  this.flush = flush;
  this.path = path;

  this.mode = options.mode || constants.DEFAULT_FILE_MODE;
  this.flag = options.flag || 'w';

  // Used by node's `fs.WriteStream`
  this.fd = null;
  this.start = null;

  this.open();

  // Dispose on finish.
  this.once('finish', this.close);
}

util.inherits(WriteStream, FlushWriteStream);

WriteStream.prototype.open = function() {
  var self = this;

  fs.open(this.path, this.flag, this.mode, onOpen);

  function onOpen(openErr, fd) {
    if (openErr) {
      self.destroy();
      self.emit('error', openErr);
      return;
    }

    self.fd = fd;
    self.emit('open', fd);
  }
};

// Use our `end` method since it is patched for flush
WriteStream.prototype.destroySoon = WriteStream.prototype.end;
// Use node's `fs.WriteStream` methods
WriteStream.prototype.destroy = fs.WriteStream.prototype.destroy;
WriteStream.prototype.close = fs.WriteStream.prototype.close;

function worker(data, encoding, callback) {
  var self = this;

  // This is from node core but I have no idea how to get code coverage on it
  if (!Buffer.isBuffer(data)) {
    return this.emit('error', new Error('Invalid data'));
  }

  if (typeof this.fd !== 'number') {
    return this.once('open', onOpen);
  }

  fs.write(this.fd, data, 0, data.length, null, onWrite);

  function onOpen() {
    self._write(data, encoding, callback);
  }

  function onWrite(writeErr) {
    if (writeErr) {
      self.destroy();
      callback(writeErr);
      return;
    }

    callback();
  }
}

function cleanup(callback) {
  if (typeof this.flush !== 'function') {
    return callback();
  }

  this.flush(this.fd, callback);
}

module.exports = {
  closeFd: closeFd,
  isValidUnixId: isValidUnixId,
  getModeDiff: getModeDiff,
  getTimesDiff: getTimesDiff,
  getOwnerDiff: getOwnerDiff,
  isOwner: isOwner,
  updateMetadata: updateMetadata,
  writeFile: writeFile,
  mkdirp: mkdirp,
  createWriteStream: createWriteStream,
};
