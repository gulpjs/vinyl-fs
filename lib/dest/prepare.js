'use strict';

var path = require('path');

var fs = require('graceful-fs');
var koalas = require('koalas');
var through = require('through2');
var valueOrFunction = require('value-or-function');

var string = valueOrFunction.string;
var number = valueOrFunction.number;
var boolean = valueOrFunction.boolean;

function prepareWrite(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  if (!outFolder) {
    throw new Error('Invalid output folder');
  }

  function normalize(file, enc, cb) {
    var defaultMode = file.stat ? file.stat.mode : null;
    var mode = koalas(number(opt.mode, file), defaultMode);
    var flag = koalas(boolean(opt.overwrite, file), true) ? 'w' : 'wx';
    var cwd = path.resolve(koalas(string(opt.cwd, file), process.cwd()));

    var outFolderPath = string(outFolder, file);
    if (!outFolderPath) {
      return cb(new Error('Invalid output folder'));
    }
    var basePath = path.resolve(cwd, outFolderPath);
    var writePath = path.resolve(basePath, file.relative);

    // Wire up new properties
    file.stat = (file.stat || new fs.Stats());
    file.stat.mode = mode;
    file.flag = flag;
    file.cwd = cwd;
    file.base = basePath;
    file.path = writePath;

    cb(null, file);
  }

  return through.obj(normalize);
}

module.exports = prepareWrite;
