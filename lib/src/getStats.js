'use strict';

var map = require('map-stream');
var fs = require('graceful-fs');

function getStats() {
  return map(fetchStats);
}

function fetchStats(file, cb) {
  fs.stat(file.path, function (err, stat) {
    if (err) {
      return cb(err);
    }

    file.stat = stat;
    cb(null, file);
  });
}

module.exports = getStats;
