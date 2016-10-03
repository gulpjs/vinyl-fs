// Create a hard-link on the File System
// This function is better suited for operating
// systems such as Windows due to the restrictions
// placed on creating a symlink directory as a User
// with Administrative rights.
'use strict';

var path = require('path');
var fs = require('graceful-fs');
var through2 = require('through2');
var valueOrFunction = require('value-or-function');
var defaultTo = require('lodash.defaultto');
var sink = require('../sink');
var prepareWrite = require('../prepare-write');

var boolean = valueOrFunction.boolean;

// When creating a hard-link the type is determined
// automatically, thus the type is not required when
// invoking fs#link(). A hard link only works when the
// paths are on the same file system. However, a hard link
// points to the i-node instead of the filename and supports
// easier dependecy management when (link)ing assets such as a
// node_module into a sub directory.
function link(dest, opt) {
  if (!opt) {
    opt = {};
  }

  function linkFile(file, enc, callback) {
    var srcPath = file.path;

    var isRelative = defaultTo(boolean(opt.relative, file), false);

    prepareWrite(dest, file, opt, onPrepare);

    function onPrepare(prepareErr) {
      if (prepareErr) {
        return callback(prepareErr);
      }

      // This is done inside prepareWrite to use the adjusted file.base property
      if (isRelative) {
        srcPath = path.relative(file.base, srcPath);
      }

      // As a hardlink points to the file system i-node
      // the idea of relative or absolute does not exist.
      // However, to ensure the source and destination are
      // linked correctly, the above code is still used.
      fs.link(srcPath, file.path, onLink);
    }

    function onLink(linkErr) {
      if (isErrorFatal(linkErr)) {
        return callback(linkErr);
      }
      callback(null, file);
    }
  }

  var stream = through2.obj(opt, linkFile);

  // Sink the stream to start flowing
  // Do this on nextTick, it will flow at slowest speed of piped streams
  process.nextTick(sink(stream));
  return stream;
}

function isErrorFatal(err) {
  if (!err) {
    return false;
  }

  // TODO: should we check file.flag like .dest()?
  if (err.code === 'EEXIST') {
    // Handle scenario for file overwrite failures.
    return false;
  }

  // Otherwise, this is a fatal error
  return true;
}

module.exports = link;
