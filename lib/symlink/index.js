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

  var rel = defaultValue(false, boolean(opt.relative));
  function linkFile(file, enc, cb) {
    var srcPath = file.path;
    var symType = (file.isDirectory() ? 'dir' : 'file');
    prepareWrite(outFolder, file, opt, function(err) {
      if (err) {
        return cb(err);
      }

      if (rel) {
        var dstDir = (fs.existsSync(file.path) && symType === 'dir')
          ? file.path
          : file.dirname;
        srcPath = path.relative(dstDir, srcPath);
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
