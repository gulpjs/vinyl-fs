'use strict';

var through2 = require('through2');
var fs = require('graceful-fs');

var defaultTo = require('lodash.defaultto');
var valueOrFunction = require('value-or-function');
var boolean = valueOrFunction.boolean;

function wrapWithVinylFile(options) {

  var followSymlinks = defaultTo(boolean(options.followSymlinks), true);

  // A stat property is exposed on file objects as a (wanted) side effect
  function resolveFile(globFile, enc, callback) {
    fs.lstat(globFile.path, onStat);

    function onStat(statErr, stat) {
      if (statErr) {
        return callback(statErr);
      }

      globFile.stat = stat;

      if (!stat.isSymbolicLink() || !followSymlinks) {
        return callback(null, globFile);
      }

      fs.realpath(globFile.path, onRealpath);
    }

    function onRealpath(realpathErr, filePath) {
      if (realpathErr) {
        return callback(realpathErr);
      }

      if (!globFile.originalSymlinkPath) {
        // Store the original symlink path before the recursive call
        // to later rewrite it back.
        globFile.originalSymlinkPath = globFile.path;
      }
      globFile.path = filePath;

      // Recurse to get real file stat
      resolveFile(globFile, enc, callback);
    }
  }

  return through2.obj(options, resolveFile);
}

module.exports = wrapWithVinylFile;
