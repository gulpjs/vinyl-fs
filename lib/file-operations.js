'use strict';

var fs = require('graceful-fs');
var path = require('path');
var assign = require('object-assign');
var isEqual = require('lodash.isequal');
var isValidDate = require('vali-date');

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

  if (!isValidDate(vinylStat.mtime)) {
    return;
  }

  if (isEqual(vinylStat.mtime, fsStat.mtime) &&
      isEqual(vinylStat.atime, fsStat.atime)) {
    return;
  }

  var atime;
  if (isValidDate(vinylStat.atime)) {
    atime = vinylStat.atime;
  } else {
    atime = fsStat.atime;
  }

  if (!isValidDate(atime)) {
    atime = undefined;
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

  if (isEqual(uid, fsStat.uid) &&
      isEqual(gid, fsStat.gid)) {
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
};
