'use strict';

var pumpify = require('pumpify');
var through2 = require('through2');
var gs = require('glob-stream');
var duplexify = require('duplexify');
var merge = require('merge-stream');
var isValidGlob = require('is-valid-glob');
var valueOrFunction = require('value-or-function');
var koalas = require('koalas');

var prepare = require('vinyl-prepare');
var sourcemap = require('./sourcemap');
var readContents = require('./read-contents');
var resolveSymlinks = require('./resolve-symlinks');

var boolean = valueOrFunction.boolean;

function src(glob, opt) {
  if (!opt) {
    opt = {};
  }

  if (!isValidGlob(glob)) {
    throw new Error('Invalid glob argument: ' + glob);
  }

  var passthroughOpt = koalas(boolean(opt.passthrough), false);

  // Don't pass `read` option on to through2
  opt.readFile = opt.read;
  opt.read = undefined;

  var inputStream;

  var streams = [
    gs.create(glob, opt),
    resolveSymlinks(opt),
    prepare.src(opt),
    readContents(opt),
    sourcemap(opt),
  ];

  var outputStream = pumpify.obj(streams);

  if (passthroughOpt) {
    inputStream = through2.obj(opt);
    outputStream = merge(outputStream, inputStream);
    outputStream = duplexify.obj(inputStream, outputStream);
  }

  return outputStream;
}


module.exports = src;
