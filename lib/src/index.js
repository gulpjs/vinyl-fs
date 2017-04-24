'use strict';

var through2 = require('through2');
var gs = require('glob-stream');
var duplexify = require('duplexify');
var merge = require('merge-stream');
var sourcemaps = require('gulp-sourcemaps');
var isValidGlob = require('is-valid-glob');
var valueOrFunction = require('value-or-function');
var koalas = require('koalas');

var prepare = require('vinyl-prepare');
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
  var sourcemapsOpt = koalas(boolean(opt.sourcemaps), false);

  // Don't pass `read` option on to through2
  opt.readFile = opt.read;
  opt.read = undefined;

  var inputStream;
  var globStream = gs.create(glob, opt);
  var outputStream = globStream
    .pipe(resolveSymlinks(opt))
    .pipe(prepare.read(opt));

  if (opt.readFile !== false) {
    outputStream = outputStream
      .pipe(readContents(opt));
  }

  if (passthroughOpt) {
    inputStream = through2.obj(opt);
    outputStream = merge(outputStream, inputStream);
    outputStream = duplexify.obj(inputStream, outputStream);
  }

  if (sourcemapsOpt) {
    outputStream = outputStream
      .pipe(sourcemaps.init({ loadMaps: true }));
  }

  globStream.on('error', outputStream.emit.bind(outputStream, 'error'));

  return outputStream;
}


module.exports = src;
