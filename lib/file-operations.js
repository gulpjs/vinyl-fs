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

  function onStat(err, stat) {
    if (err) {
      return callback(err);
    }

    // Check if mode needs to be updated
    var modeDiff = getModeDiff(stat.mode, file.stat.mode);

    // Check if atime/mtime need to be updated
    var timesDiff = getTimesDiff(stat, file.stat);

    // Set file.stat to the reflect current state on disk
    assign(file.stat, stat);

    // Nothing to do
    if (!modeDiff && !timesDiff) {
      return callback(null);
    }

    // Check access, `futimes` and `fchmod` only work if we own the file,
    // or if we are effectively root.
    if (!isOwner(stat)) {
      return callback(null);
    }

    if (modeDiff) {
      return mode();
    }
    times();

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
        callback(fchmodErr);
      }
    }

    function times(fchmodErr) {
      fs.futimes(fd, timesDiff.atime, timesDiff.mtime, onFutimes);

      function onFutimes(futimesErr) {
        if (!futimesErr) {
          file.stat.atime = timesDiff.atime;
          file.stat.mtime = timesDiff.mtime;
        }
        callback(fchmodErr || futimesErr);
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
    callback(new TypeError('Data must be a Buffer'));
    return;
  }

  if (!options) {
    options = {};
  }

  // Default the same as node
  var mode = options.mode || constants.DEFAULT_FILE_MODE;
  var flag = options.flag || 'w';
  var position = APPEND_MODE_REGEXP.test(flag) ? null : 0;

  fs.open(filepath, flag, mode, onOpen);

  function onOpen(err, fd) {
    if (err) {
      return onComplete(err);
    }

    fs.write(fd, data, 0, data.length, position, onComplete);

    function onComplete(err) {
      callback(err, fd);
    }
  }
}

function mkdirp(dirpath, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode = undefined;
  }

  var m = mode || constants.DEFAULT_DIR_MODE;
  var cb = callback || function() {};
  dirpath = path.resolve(dirpath);

  fs.mkdir(dirpath, m, function(er) {
    if (!er) {
      return cb();
    }
    switch (er.code) {
      case 'ENOENT': {
        mkdirp(path.dirname(dirpath), m, function(er) {
          if (er) {
            cb(er);
          } else {
            mkdirp(dirpath, m, cb);
          }
        });
        break;
      }

      case 'EEXIST': {
        if (mode) {
          fs.chmod(dirpath, mode, cb);
        } else {
          cb();
        }
        break;
      }

      default: {
        cb(er);
        break;
      }
    }
  });
}

module.exports = {
  closeFd: closeFd,
  getModeDiff: getModeDiff,
  getTimesDiff: getTimesDiff,
  isOwner: isOwner,
  updateMetadata: updateMetadata,
  writeFile: writeFile,
  mkdirp: mkdirp,
};
