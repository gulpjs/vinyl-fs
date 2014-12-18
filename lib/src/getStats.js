'use strict';

var through2 = require('through2');
var fs = require('graceful-fs');

function getStats(options) {
  return through2.obj(fetchStats(options));
}

function fetchStats(options) {
  var statMethod = (options && options.followSymlink) ? fs.lstat : fs.stat;
  return function (file, enc, cb) {
    statMethod(file.path, function (err, stat) {
      if (stat) {
        file.stat = stat;
      }
      cb(err, file);
    });
  };
}

module.exports = getStats;
