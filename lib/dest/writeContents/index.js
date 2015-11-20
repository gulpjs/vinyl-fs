'use strict';

var fs = require('fs');

var writeDir = require('./writeDir');
var writeStream = require('./writeStream');
var writeBuffer = require('./writeBuffer');
var writeSymbolicLink = require('./writeSymbolicLink');


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

  return {atime: atime, mtime: mtime};
}


// http://stackoverflow.com/a/10589791/586382
function validDate(date) {
  return date instanceof Date && !isNaN(date.valueOf());
}

function futimes(fd, oldStat, newStat, cb) {
  setTimeout(function() {
    var stat = getUtimes(oldStat, newStat);
    if(!stat) {
      return cb();
    }

    // Set file `atime` and `mtime` fields
    fs.futimes(fd, stat.atime, stat.mtime, cb);
  }, 0);
}

function utimes(writePath, oldStat, newStat, cb) {
  var stat = getUtimes(oldStat, newStat);
  if(!stat) {
    return cb();
  }

  // Set file `atime` and `mtime` fields
  fs.utimes(writePath, stat.atime, stat.mtime, cb);
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

  function checkChmod(st, complete) {
    if (typeof file.stat.mode !== 'number') {
      return complete();
    }
    var currentMode = (st.mode & parseInt('0777', 8));
    var expectedMode = (file.stat.mode & parseInt('0777', 8));
    if (currentMode === expectedMode) {
      return complete();
    }

    complete(expectedMode);
  }

  function written(err, fd) {

    if (isErrorFatal(err)) {
      return complete(err);
    }

    if (!file.stat) {
      return complete();
    }

    if (typeof fd === 'number') {
      return fs.fstat(fd, function(err, st) {
        function complete2(err1) {
          fs.close(fd, function(err2) {
            complete(err1 || err2);
          });
        }

        if (err) {
          return complete2(err);
        }

        checkChmod(st, function(expectedMode)
        {
          if(expectedMode == null) {
            return futimes(fd, st, file.stat, complete2);
          }

          fs.fchmod(fd, expectedMode, function(error) {
            if (error) {
              return complete2(error);
            }

            futimes(fd, st, file.stat, complete2);
          });
        });
      });
    }

    fs.lstat(writePath, function(err, st) {
      if (err) {
        return complete(err);
      }

      checkChmod(st, function(expectedMode)
      {
        if(expectedMode == null) {
          return utimes(writePath, st, file.stat, complete);
        }

        fs.chmod(writePath, expectedMode, function(error) {
          if (error) {
            return complete(error);
          }

          utimes(writePath, st, file.stat, complete);
        });
      });
    });
  }

  function isErrorFatal(err) {
    if (!err) {
      return false;
    }

    if (err.code === 'EEXIST' && file.flag === 'wx') {
      // Handle scenario for file overwrite failures.
      return false;   // "These aren't the droids you're looking for"
    }

    // Otherwise, this is a fatal error
    return true;
  }
}

module.exports = writeContents;
