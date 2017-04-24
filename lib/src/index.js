'use strict';

var assign = require('object-assign');
var through2 = require('through2');
var gs = require('glob-stream');
var duplexify = require('duplexify');
var merge = require('merge-stream');
var sourcemaps = require('gulp-sourcemaps');
var isValidGlob = require('is-valid-glob');
var valueOrFunction = require('value-or-function');
var koalas = require('koalas');

var filterSince = require('../filter-since');
var readContents = require('./read-contents');
var wrapWithVinylFile = require('./wrap-with-vinyl-file');

var boolean = valueOrFunction.boolean;
var date = valueOrFunction.date;

function src(glob, opt) {
  if (!opt) {
    opt = {};
  }

  var options = assign({}, opt, {
    buffer: koalas(boolean(opt.buffer), true),
    read: koalas(boolean(opt.read), true),
    since: date(opt.since),
    stripBOM: koalas(boolean(opt.stripBOM), true),
    sourcemaps: koalas(boolean(opt.sourcemaps), false),
    passthrough: koalas(boolean(opt.passthrough), false),
    followSymlinks: koalas(boolean(opt.followSymlinks), true),
  });

  // Don't pass `read` option on to through2
  var read = options.read !== false;
  options.read = undefined;

  var inputPass;

  if (!isValidGlob(glob)) {
    throw new Error('Invalid glob argument: ' + glob);
  }

  var globStream = gs.create(glob, options);

  var outputStream = globStream
    .pipe(wrapWithVinylFile(options));

  if (options.since != null) {
    outputStream = outputStream
      .pipe(filterSince(options.since));
  }

  if (read) {
    outputStream = outputStream
      .pipe(readContents(options));
  }

  if (options.passthrough === true) {
    inputPass = through2.obj(options);
    outputStream = duplexify.obj(inputPass, merge(outputStream, inputPass));
  }
  if (options.sourcemaps === true) {
    outputStream = outputStream
      .pipe(sourcemaps.init({ loadMaps: true }));
  }
  globStream.on('error', outputStream.emit.bind(outputStream, 'error'));
  return outputStream;
}

module.exports = src;
