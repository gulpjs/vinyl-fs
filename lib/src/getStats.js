'use strict';

var through2 = require('through2');
var fs = require('graceful-fs');

function getStats() {
  return through2.obj(fetchStats);
}

function fetchStats(file, enc, cb) {
  try {
    file.stat = fs.statSync(file.path);
  } catch (err) {
    return cb(err, file);
  }

  cb(null, file);
}

module.exports = getStats;
