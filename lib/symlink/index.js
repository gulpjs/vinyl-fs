'use strict';

var through2 = require('through2');
var fs = require('graceful-fs');
var path = require('path');
var valueOrFunction = require('value-or-function');

var prepareWrite = require('../prepare-write');
var defaultValue = require('../default-value');

var boolean = valueOrFunction.boolean;

function symlink(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  function linkFile(file, enc, callback) {
    var srcPath = file.path;
    var symType = (file.isDirectory() ? 'dir' : 'file');
    var isRelative = defaultValue(false, boolean(opt.relative, file));

    prepareWrite(outFolder, file, opt, onPrepare);

    function onPrepare(prepareErr) {
      if (prepareErr) {
        return callback(prepareErr);
      }

      // This is done inside prepareWrite to use the adjusted file.base property
      if (isRelative) {
        srcPath = path.relative(file.base, srcPath);
      }

      fs.symlink(srcPath, file.path, symType, onSymlink);
    }

    function onSymlink(symlinkErr) {
      if (isErrorFatal(symlinkErr)) {
        return callback(symlinkErr);
      }
      callback(null, file);
    }
  }

  var stream = through2.obj(opt, linkFile);
  // TODO: option for either backpressure or lossy
  stream.resume();
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

module.exports = symlink;
