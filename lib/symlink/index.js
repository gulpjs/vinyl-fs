'use strict';

var path = require('path');

var fs = require('graceful-fs');
var pumpify = require('pumpify');
var through = require('through2');
var prepare = require('vinyl-prepare');
var koalas = require('koalas');
var valueOrFunction = require('value-or-function');

var fo = require('../file-operations');
var sink = require('../sink');

var number = valueOrFunction.number;
var boolean = valueOrFunction.boolean;

function symlink(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  function linkFile(file, enc, callback) {
    // Fetch the path as it was before prepare.dest()
    var srcPath = file.history[file.history.length - 2];
    var symType = (file.isDirectory() ? 'dir' : 'file');
    var isRelative = koalas(boolean(opt.relative, file), false);

    // This is done inside prepareWrite to use the adjusted file.base property
    if (isRelative) {
      srcPath = path.relative(file.base, srcPath);
    }

    // TODO: make DRY with .dest()
    var dirMode = number(opt.dirMode, file);
    var writeFolder = path.dirname(file.path);

    fo.mkdirp(writeFolder, dirMode, onMkdirp);

    function onMkdirp(mkdirpErr) {
      if (mkdirpErr) {
        return callback(mkdirpErr);
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

  var stream = pumpify.obj(
    prepare.dest(outFolder, opt),
    through.obj(opt, linkFile)
  );
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

module.exports = symlink;
