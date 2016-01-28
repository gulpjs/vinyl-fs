'use strict';

var fs = require('graceful-fs');
var assign = require('object-assign');

var writeDir = require('./writeDir');
var writeStream = require('./writeStream');
var writeBuffer = require('./writeBuffer');
var writeSymbolicLink = require('./writeSymbolicLink');

// TODO include sticky/setuid/setgid, i.e. 7777?
var MASK_MODE = parseInt('0777', 8);


// http://stackoverflow.com/a/10589791/586382
function validDate(date) {
  return date instanceof Date && !isNaN(date.valueOf());
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
    return finish();
  }


  // This is invoked by the various writeXxx modules when they've finished
  // writing the contents.
  // The third argument, if present, should be invoked to indicate we're done
  // with the file descriptor.
  function written(err, fd, close) {
    close = close || function(err, cb) {
      cb(err);
    };

    if (err && !(err.code === 'EEXIST' && file.flag === 'wx')) {
      return close(err, finish);
    }

    // TODO handle symlinks properly
    if (!file.stat || file.symlink) {
      return close(null, finish);
    }

    if (typeof fd === 'number') {
      return stat(fd, close);
    }

    // No file descriptor given (writeDir or writeSymbolicLink) so create one.
    fs.open(writePath, 'r', function(err, fd) {
      if (err) {
        return close(err, finish);
      }

      stat(fd, function(err1) {
        fs.close(fd, function(err2) {
          finish(err1 || err2);
        });
      });
    });
  }


  // Set mode and/or atime, mtime.
  function stat(fd, close) {
    fs.fstat(fd, function(err, stat) {
      if (err) {
        return close(err, finish);
      }

      // Check if mode needs to be updated
      var modeDiff = 0;
      if (typeof file.stat.mode === 'number') {
        modeDiff = (file.stat.mode ^ stat.mode) & MASK_MODE;
      }

      // Check if atime/mtime need to be updated
      var timesDiff = null;
      if (validDate(file.stat.mtime)) {
        timesDiff = {
          mtime: file.stat.mtime,
          atime: validDate(file.stat.atime) ? file.stat.atime : stat.atime,
        };
      }

      // Set file.stat to the reflect current state on disk
      assign(file.stat, stat);

      // Nothing to do
      if (!modeDiff && !timesDiff) {
        return close(null, finish);
      }

      // Check access, `futimes` and `fchmod` only work if we own the file,
      // or if we are effectively root.
      var uid = process.geteuid ? process.geteuid() : process.getuid();
      if (stat.uid !== uid && uid !== 0) {
        return close(null, finish);
      }

      if (modeDiff) {
        return mode();
      }
      times();

      function mode() {
        var mode = stat.mode ^ modeDiff;
        fs.fchmod(fd, mode, function(err) {
          if (!err) {
            file.stat.mode = mode;
            file.stat.ctime.setTime(Date.now());
          }
          if (timesDiff) {
            return times(err);
          }
          close(err, finish);
        });
      }

      function times(err1) {
        fs.futimes(fd, timesDiff.atime, timesDiff.mtime, function(err2) {
          if (!err2) {
            file.stat.atime = timesDiff.atime;
            file.stat.mtime = timesDiff.mtime;
            file.stat.ctime.setTime(Date.now());
          }
          close(err1 || err2, finish);
        });
      }
    });
  }


  // This is invoked by the close callbacks; we're all done.
  function finish(err) {
    cb(err, file);
  }



}

module.exports = writeContents;
