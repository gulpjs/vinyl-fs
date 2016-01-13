'use strict';

var fs = require('fs');

var writeDir = require('./writeDir');
var writeStream = require('./writeStream');
var writeBuffer = require('./writeBuffer');
var writeSymbolicLink = require('./writeSymbolicLink');


function getMode(oldStat, newStat) {
  if (typeof newStat.mode !== 'number') {
    return;
  }

  var currentMode = (oldStat.mode & parseInt('0777', 8));
  var expectedMode = (newStat.mode & parseInt('0777', 8));
  if (currentMode !== expectedMode) {
    return expectedMode;
  }
}

function getUtimes(oldStat, newStat) {
  // `futimes` only works if we own the file
  if (oldStat.uid !== process.getuid()) {
    return;
  }

  // Given `mtime` is not valid, do nothing
  var mtime = newStat.mtime;
  if (!validDate(mtime)) {
    return;
  }

  // Given `atime` is not valid, assign a new one with current time
  var atime = newStat.atime;
  if (!validDate(atime)) {
    atime = new Date();
  }

  return { atime: atime, mtime: mtime };
}


// http://stackoverflow.com/a/10589791/586382
function validDate(date) {
  return date instanceof Date && !isNaN(date.valueOf());
}

function futimes(fd, oldStat, newStat, cb) {
  setTimeout(function() {
    var stat = getUtimes(oldStat, newStat);
    if (!stat) {
      return cb();
    }

    // Set file `atime` and `mtime` fields
    fs.futimes(fd, stat.atime, stat.mtime, cb);
  }, 0);
}


function writeContents(writePath, file, cb) {
  // If directory then mkdirp it
  if (file.isDirectory()) {
    return writeDir(writePath, file, written);
  }

  // Stream it to disk yo
  if (file.isStream()) {
    return writeStream(writePath, file, written);
  }

  // Write it as a symlink
  if (file.symlink) {
    return writeSymbolicLink(writePath, file, written);
  }

  // Write it like normal
  if (file.isBuffer()) {
    return writeBuffer(writePath, file, written);
  }

  // If no contents then do nothing
  if (file.isNull()) {
    return complete();
  }

  function complete(err) {
    cb(err, file);
  }

  function stat(fd) {
    function complete2(err1) {
      fs.close(fd, function(err2) {
        complete(err1 || err2);
      });
    }

    fs.fstat(fd, function(err, st) {
      if (err) {
        return complete2(err);
      }

      var stat = file.stat;
      var mode = getMode(st, stat);
      if (mode == null) {
        return futimes(fd, st, stat, complete2);
      }

      fs.fchmod(fd, mode, function(error) {
        if (error) {
          return complete2(error);
        }

        futimes(fd, st, stat, complete2);
      });
    });
  }


  function written(err, fd) {
    if (isErrorFatal(err)) {
      return complete(err);
    }

    if (!file.stat) {
      return complete();
    }

    if (typeof fd === 'number') {
      return stat(fd);
    }

    fs.open(writePath, 'r', function(err, fd) {
      if (err) {
        return complete(err);
      }

      stat(fd);
    });
  }

  function isErrorFatal(err) {
    if (!err) {
      return false;
    }

    // Handle scenario for file overwrite failures.
    if (err.code === 'EEXIST' && file.flag === 'wx') {
      return false;   // "These aren't the droids you're looking for"
    }

    // Otherwise, this is a fatal error
    return true;
  }
}

module.exports = writeContents;
