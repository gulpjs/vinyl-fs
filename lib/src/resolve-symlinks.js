'use strict';

var through = require('through2');
var fs = require('graceful-fs');

var koalas = require('koalas');
var valueOrFunction = require('value-or-function');
var boolean = valueOrFunction.boolean;

function resolveSymlinks(opt) {

  var resolveSymlinks = koalas(boolean(opt.resolveSymlinks), true);

  // A stat property is exposed on file objects as a (wanted) side effect
  function resolveFile(globFile, enc, callback) {
    fs.lstat(globFile.path, onStat);

    function onStat(statErr, stat) {
      if (statErr) {
        return callback(statErr);
      }

      if (!stat.isSymbolicLink() || !resolveSymlinks) {
        globFile.stat = stat;
        return callback(null, globFile);
      }

      // Recurse to get real file stat
      fs.stat(globFile.path, onStat);
    }
  }

  return through.obj(resolveFile);
}

module.exports = resolveSymlinks;
