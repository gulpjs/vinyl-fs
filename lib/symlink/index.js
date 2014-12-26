'use strict';

var assign = require('object-assign');
var path = require('path');
var through2 = require('through2');
var mkdirp = require('mkdirp');
var fs = require('graceful-fs');

function symlink(outFolder, opt) {
  opt = opt || {};
  if (typeof outFolder !== 'string' && typeof outFolder !== 'function') {
    throw new Error('Invalid output folder');
  }

  var options = assign({
    cwd: process.cwd()
  }, opt);

  var cwd = path.resolve(options.cwd);

  function linkFile (file, enc, cb) {
    var basePath;
    if (typeof outFolder === 'string') {
      basePath = path.resolve(cwd, outFolder);
    }
    if (typeof outFolder === 'function') {
      basePath = path.resolve(cwd, outFolder(file));
    }
    var writePath = path.resolve(basePath, file.relative);
    var writeFolder = path.dirname(writePath);
    var srcPath = file.path;

    // wire up new properties
    file.stat = file.stat ? file.stat : new fs.Stats();
    file.stat.mode = (options.mode || file.stat.mode);
    file.cwd = cwd;
    file.base = basePath;
    file.path = writePath;

    // mkdirp the folder the file is going in
    mkdirp(writeFolder, function(err){
      if (err) {
        return cb(err);
      }
      fs.symlink(srcPath, writePath, function (err) {
        if (err && err.code !== 'EEXIST') {
          return cb(err);
        }

        cb(null, file);
      });
    });
  }

  var stream = through2.obj(linkFile);
  // TODO: option for either backpressure or lossy
  stream.resume();
  return stream;
}

module.exports = symlink;
