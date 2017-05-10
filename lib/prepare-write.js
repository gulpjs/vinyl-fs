'use strict';

var path = require('path');

var fs = require('graceful-fs');
var through = require('through2');

var options = require('./options');

function prepareWrite() {

  function prepare(file, enc, cb) {
    var mode = options.get(file, 'mode');
    var cwd = options.get(file, 'cwd');

    cwd = path.resolve(cwd);

    var outFolderPath = options.get(file, 'outFolder');
    if (!outFolderPath) {
      return cb(new Error('Invalid output folder'));
    }
    var basePath = path.resolve(cwd, outFolderPath);
    var writePath = path.resolve(basePath, file.relative);

    // Wire up new properties
    file.stat = (file.stat || new fs.Stats());
    file.stat.mode = mode;
    file.cwd = cwd;
    file.base = basePath;
    file.path = writePath;

    cb(null, file);
  }

  return through.obj(prepare);
}

module.exports = prepareWrite;
