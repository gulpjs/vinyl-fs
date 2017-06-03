'use strict';

var through = require('through2');
var fs = require('graceful-fs');

function resolveSymlinks(optResolver) {

  // A stat property is exposed on file objects as a (wanted) side effect
  function resolveFile(file, enc, callback) {

    fs.lstat(file.path, onStat);

    function onStat(statErr, stat) {
      if (statErr) {
        return callback(statErr);
      }

      file.stat = stat;

      if (!stat.isSymbolicLink()) {
        return callback(null, file);
      }

      var resolveSymlinks = optResolver.resolve('resolveSymlinks', file);

      if (!resolveSymlinks) {
        return callback(null, file);
      }

      // Recurse to get real file stat
      fs.stat(file.path, onStat);
    }
  }

  return through.obj(resolveFile);
}

module.exports = resolveSymlinks;
