'use strict';

var gs = require('glob-stream');
var pumpify = require('pumpify');
var prepare = require('vinyl-prepare');
var toThrough = require('to-through');
var isValidGlob = require('is-valid-glob');

var sourcemap = require('./sourcemap');
var readContents = require('./read-contents');
var resolveSymlinks = require('./resolve-symlinks');

function src(glob, opt) {
  if (!opt) {
    opt = {};
  }

  if (!isValidGlob(glob)) {
    throw new Error('Invalid glob argument: ' + glob);
  }

  // Don't pass `read` option on to through2
  opt.readFile = opt.read;
  opt.read = undefined;

  var streams = [
    gs.create(glob, opt),
    resolveSymlinks(opt),
    prepare.src(opt),
    readContents(opt),
    sourcemap(opt),
  ];

  var outputStream = pumpify.obj(streams);

  return toThrough(outputStream);
}


module.exports = src;
