'use strict';

var through2 = require('through2');
var fs = require('graceful-fs');
var File = require('vinyl');

function wrapWithVinylFile(options) {

  // A stat property is exposed on file objects as a (wanted) side effect
  function resolveFile(globFile, enc, cb) {
    fs.lstat(globFile.path, function(err, stat) {
      if (err) {
        return cb(err);
      }

      globFile.stat = stat;

      if (!stat.isSymbolicLink() || !options.followSymlinks) {
        var vinylFile = new File(globFile);
        if (globFile.symlinkTarget) {
          // If we reach here, it means there is at least one
          // symlink on the path and we need to rewrite the path
          // to its original value.
          // Updated file stats will tell getContents() to actually read it.
          vinylFile.path = globFile.symlinkTarget;
        }
        return cb(null, vinylFile);
      }
      if (!globFile.symlinkTarget) {
        globFile.symlinkTarget = globFile.path;
      }

      fs.realpath(globFile.path, function(err, filePath) {
        if (err) {
          return cb(err);
        }

        globFile.path = filePath;

        // Recurse to get real file stat
        return resolveFile(globFile, enc, cb);
      });
    });
  }

  return through2.obj(options, resolveFile);
}

module.exports = wrapWithVinylFile;
