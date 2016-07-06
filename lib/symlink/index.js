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

  function linkFile(file, enc, cb) {
    var srcPath = file.path;
    var symType = (file.isDirectory() ? 'dir' : 'file');
    var isRelative = defaultValue(false, boolean(opt.relative, file));

    prepareWrite(outFolder, file, opt, function(err) {
      if (err) {
        return cb(err);
      }

      // This is done inside prepareWrite to use the adjusted file.base property
      if (isRelative) {
        srcPath = path.relative(file.base, srcPath);
      }

      fs.symlink(srcPath, file.path, symType, function(err) {
        if (err && err.code !== 'EEXIST') {
          return cb(err);
        }
        cb(null, file);
      });
    });
  }

  var stream = through2.obj(opt, linkFile);
  // TODO: option for either backpressure or lossy
  stream.resume();
  return stream;
}

module.exports = symlink;
