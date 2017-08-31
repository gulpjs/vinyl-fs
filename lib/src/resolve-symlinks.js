'use strict';

var through = require('through2');
var fs = require('graceful-fs');

function resolveSymlinks(optResolver, statCache) {

  // A stat property is exposed on file objects as a (wanted) side effect
  function resolveFile(file, enc, callback) {

    var cached = statCache[file.path];
    if (cached && optResolver.resolveConstant('resolveSymlinks')) {
      file.stat = cached;
      return callback(null, file);
    }

    fs.lstat(file.path, onStat);

    function onStat(statErr, stat) {
      if (statErr) {
        return callback(statErr);
      }

      file.stat = stat;

      if (!stat.isSymbolicLink()) {
        statCache[file.path] = stat;
        return callback(null, file);
      }

      if (!optResolver.resolve('resolveSymlinks', file)) {
        return callback(null, file);
      }

      // Attach the stat for the link's target
      if (cached) {
        file.stat = cached;
        return callback(null, file);
      }

      // Recurse to get real file stat
      fs.stat(file.path, onStat);
    }
  }

  return through.obj(resolveFile);
}

module.exports = resolveSymlinks;
