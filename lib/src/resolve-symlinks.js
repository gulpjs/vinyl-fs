'use strict';

var through = require('through2');
var fs = require('graceful-fs');

var options = require('../options');

function resolveSymlinks() {

  // A stat property is exposed on file objects as a (wanted) side effect
  function resolveFile(file, enc, callback) {
    var resolveSymlinks = options.get(file, 'resolveSymlinks');

    fs.lstat(file.path, onStat);

    function onStat(statErr, stat) {
      if (statErr) {
        return callback(statErr);
      }

      if (!stat.isSymbolicLink() || !resolveSymlinks) {
        file.stat = stat;
        return callback(null, file);
      }

      // Recurse to get real file stat
      fs.stat(file.path, onStat);
    }
  }

  return through.obj(resolveFile);
}

module.exports = resolveSymlinks;
