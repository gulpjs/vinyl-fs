'use strict';

var fs = require('graceful-fs');

var S_IWUSR = require('constants').S_IWUSR;

// http://stackoverflow.com/a/10589791/586382
function validDate(date) {
  return date instanceof Date && !isNaN(date.valueOf());
}

function futimes(fd, stat, cb) {
  // `futimes` only works for owned files with write access
  var fileNotOwned    = stat.uid  != null && stat.uid !== process.getuid();
  var fileNotWritable = stat.mode != null && !(stat.mode & S_IWUSR);
  if(fileNotOwned || fileNotWritable) {
    return cb();
  }

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
  fs.futimes(fd, atime, mtime, cb);
}

module.exports = futimes;
