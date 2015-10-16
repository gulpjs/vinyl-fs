'use strict';

var fs = require('graceful-fs');

// http://stackoverflow.com/a/10589791/586382
function validDate(date) {
  return date instanceof Date && !isNaN(date.valueOf());
}

function utimes(writePath, stat, cb) {
  var mtime = stat.mtime;

  if (mtime) {
    var atime = stat.atime || new Date();

    if(validDate(atime) && validDate(mtime)) {
      return fs.utimes(writePath, atime, mtime, cb);
    }
  }

  cb();
}

module.exports = utimes;
