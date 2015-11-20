'use strict';

var fs = require('fs');
var writeDir = require('./writeDir');
var writeStream = require('./writeStream');
var writeBuffer = require('./writeBuffer');
var writeSymbolicLink = require('./writeSymbolicLink');

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
            return complete2();
          }

          fs.fchmod(fd, expectedMode, complete2);
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
          return complete();
        }

        fs.chmod(writePath, expectedMode, complete);
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
