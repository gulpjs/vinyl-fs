'use strict';

var fs = require('graceful-fs');

// http://stackoverflow.com/a/10589791/586382
function validDate(date) {
  return date instanceof Date && !isNaN(date.valueOf());
}

function utimes(writePath, stat, cb) {
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
  fs.utimes(writePath, atime, mtime, cb);
}

module.exports = utimes;
