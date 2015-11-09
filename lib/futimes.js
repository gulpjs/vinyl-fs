'use strict';

var fs = require('graceful-fs');

// http://stackoverflow.com/a/10589791/586382
function validDate(date) {
  return date instanceof Date && !isNaN(date.valueOf());
}

function futimes(fd, stat, cb) {
  // Given `mtime` is not valid, do nothing
  var mtime = stat.mtime;
  if (!validDate(mtime)) {
    return cb();
  }

  // Given `atime` is not valid, assign a new one with current time
  var atime = stat.atime;
  if (!validDate(atime)) {
    atime = new Date();
  }

  // Set file `atime` and `mtime` fields
  fs.futimes(fd, atime, mtime, function(error) {
    // Ignore `EPERM` error. This will only happen when modifying an existing
    // file that we don't own instead of creating a new one
    if (error && error.code !== 'EPERM') {
      return cb(error);
    }

    cb();
  });
}

module.exports = futimes;
