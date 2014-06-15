'use strict';

var through2 = require('through2');
var fs = require('graceful-fs');

function getStats() {
  return through2.obj(fetchStats);
}

function fetchStats(file, enc, done) {
  fs.stat(file.path, function (err, stat) {
    if (stat) {
      file.stat = stat;
    }
    done(err, file);
  });
}

module.exports = getStats;
