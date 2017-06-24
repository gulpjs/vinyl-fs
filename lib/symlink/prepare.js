'use strict';

// TODO: currently a copy-paste of prepareWrite but should be customized

var path = require('path');

var fs = require('graceful-fs');
var through = require('through2');

function prepareSymlink(folderResolver, optResolver) {
  if (!folderResolver) {
    throw new Error('Invalid output folder');
  }

  function normalize(file, enc, cb) {
    var mode = optResolver.resolve('mode', file);
    var cwd = path.resolve(optResolver.resolve('cwd', file));

    var outFolderPath = folderResolver.resolve('outFolder', file);
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
    file.symlink = file.path;
    file.path = writePath;

    cb(null, file);
  }

  return through.obj(normalize);
}

module.exports = prepareSymlink;
