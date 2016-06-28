'use strict';

var assign = require('object-assign');
var path = require('path');
var mkdirp = require('mkdirp');
var fs = require('graceful-fs');

var valueOrFunction = require('value-or-function');
var defaultValue = require('./default-value');

var boolean = valueOrFunction.boolean;
var number = valueOrFunction.number;
var string = valueOrFunction.string;

function prepareWrite(outFolder, file, opt, cb) {
  if (!opt) {
    opt = {};
  }

  var defaultMode = file.stat ? file.stat.mode : null;
  var options = assign({}, opt, {
    cwd: defaultValue(process.cwd(), string(opt.cwd, file)),
    mode: defaultValue(defaultMode, number(opt.mode, file)),
    dirMode: number(opt.dirMode, file),
    overwrite: defaultValue(true, boolean(opt.overwrite, file)),
  });
  options.flag = (options.overwrite ? 'w' : 'wx');

  var cwd = path.resolve(options.cwd);
  var outFolderPath = string(outFolder, file);
  if (!outFolderPath) {
    throw new Error('Invalid output folder');
  }
  var basePath = path.resolve(cwd, outFolderPath);
  if (!basePath) {
    throw new Error('Invalid base option');
  }

  var writePath = path.resolve(basePath, file.relative);
  var writeFolder = path.dirname(writePath);

  // Wire up new properties
  file.stat = (file.stat || new fs.Stats());
  file.stat.mode = options.mode;
  file.flag = options.flag;
  file.cwd = cwd;
  file.base = basePath;
  file.path = writePath;

  // Mkdirp the folder the file is going in
  var mkdirpOpts = {
    mode: options.dirMode,
    fs: fs,
  };
  mkdirp(writeFolder, mkdirpOpts, function(err) {
    if (err) {
      return cb(err);
    }
    cb(null);
  });
}

module.exports = prepareWrite;
