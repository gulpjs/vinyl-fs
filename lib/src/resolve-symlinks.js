'use strict';

var fs = require('graceful-fs');
var Transform = require('streamx').Transform;
var fo = require('../file-operations');

function resolveSymlinks(optResolver) {

  // A stat property is exposed on file objects as a (wanted) side effect
  function resolveFile(file, callback) {

    fo.reflectLinkStat(file.path, file, onReflect);

    function onReflect(statErr) {
      if (statErr) {
        return callback(statErr);
      }

      if (!file.stat.isSymbolicLink()) {
        return callback(null, file);
      }

      var resolveSymlinks = optResolver.resolve('resolveSymlinks', file);

      if (!resolveSymlinks) {
        return callback(null, file);
      }

      // Node 10 on Windows fails with EPERM if you stat a symlink to a directory so we realpath before we reflect stats
      // TODO: Remove when we drop Node 10 support
      fs.realpath(file.path, onRealpath);
    }

    function onRealpath(readlinkErr, path) {
      if (readlinkErr) {
        return callback(readlinkErr);
      }

      // Get target's stats
      fo.reflectStat(path, file, onReflect);
    }
  }

  return new Transform({
    transform: resolveFile,
  });
}

module.exports = resolveSymlinks;
