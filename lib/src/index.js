'use strict';

var gs = require('glob-stream');
var pumpify = require('pumpify');
var prepare = require('vinyl-prepare');
var toThrough = require('to-through');
var isValidGlob = require('is-valid-glob');

var wrapVinyl = require('./wrap-vinyl');
var sourcemap = require('./sourcemap');
var readContents = require('./read-contents');
var resolveSymlinks = require('./resolve-symlinks');
var options = require('../options');

var koalas = require('koalas');
var valueOrFunction = require('value-or-function');
var boolean = valueOrFunction.boolean;

function src(glob, opt) {
  if (!opt) {
    opt = {};
  }

  if (!isValidGlob(glob)) {
    throw new Error('Invalid glob argument: ' + glob);
  }

  function resolveOptions(file) {
    // Never re-use opts
    var ourOpts = {};

    ourOpts.read = koalas(boolean(opt.read, file), true);
    ourOpts.buffer = koalas(boolean(opt.buffer, file), true);
    ourOpts.stripBOM = koalas(boolean(opt.stripBOM, file), true);
    ourOpts.sourcemaps = koalas(boolean(opt.sourcemaps, file), false);
    ourOpts.resolveSymlinks = koalas(boolean(opt.resolveSymlinks, file), true);

    return ourOpts;
  }

  var streams = [
    gs(glob, opt),
    wrapVinyl(),
    options.attach(resolveOptions),
    resolveSymlinks(),
    prepare.src(opt),
    readContents(),
    sourcemap(),
    options.unattach(),
  ];

  var outputStream = pumpify.obj(streams);

  return toThrough(outputStream);
}


module.exports = src;
