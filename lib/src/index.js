'use strict';

var gs = require('glob-stream');
var pipeline = require('streamx').pipeline;
var toThrough = require('to-through');
var isValidGlob = require('is-valid-glob');
var createResolver = require('resolve-options');

var config = require('./options');
var prepare = require('./prepare');
var wrapVinyl = require('./wrap-vinyl');
var sourcemap = require('./sourcemap');
var readContents = require('./read-contents');
var resolveSymlinks = require('./resolve-symlinks');

function src(glob, opt) {
  var optResolver = createResolver(config, opt);

  if (!isValidGlob(glob)) {
    throw new Error('Invalid glob argument: ' + glob);
  }

  var outputStream = pipeline(
    gs(glob, opt),
    wrapVinyl(optResolver),
    resolveSymlinks(optResolver),
    prepare(optResolver),
    readContents(optResolver),
    sourcemap(optResolver)
  );

  return toThrough(outputStream);
}


module.exports = src;
