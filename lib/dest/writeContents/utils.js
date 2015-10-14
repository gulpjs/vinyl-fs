'use strict';

var fs = require('graceful-fs');

function utimes(writePath, stat, cb) {
  if (stat.mtime) {
    stat.atime = stat.atime || new Date();

    return fs.utimes(writePath, stat.atime, stat.mtime, cb);
  }

  cb();
}

exports.utimes = utimes;
