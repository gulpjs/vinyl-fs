'use strict';

var assign = require('object-assign');
var path = require('path');
var fs = require('graceful-fs');
var valueOrFunction = require('value-or-function');
var defaultTo = require('lodash.defaultto');

var fo = require('./file-operations');

var boolean = valueOrFunction.boolean;
var number = valueOrFunction.number;
var string = valueOrFunction.string;

function prepareWrite(outFolder, file, opt, callback) {
  if (!opt) {
    opt = {};
  }

  var defaultMode = file.stat ? file.stat.mode : null;
  var options = assign({}, opt, {
    cwd: defaultTo(string(opt.cwd, file), process.cwd()),
    mode: defaultTo(number(opt.mode, file), defaultMode),
    dirMode: number(opt.dirMode, file),
    overwrite: defaultTo(boolean(opt.overwrite, file), true),
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
  // Ensure the base always ends with a separator
  // TODO: add a test for this
  file.base = path.normalize(basePath + path.sep);
  file.path = writePath;

  fo.mkdirp(writeFolder, options.dirMode, onMkdirp);

  function onMkdirp(mkdirpErr) {
    if (mkdirpErr) {
      return callback(mkdirpErr);
    }
    callback();
  }
}

module.exports = prepareWrite;
