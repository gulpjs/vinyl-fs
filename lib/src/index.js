'use strict';

var gs = require('glob-stream');
var pumpify = require('pumpify');
var toThrough = require('to-through');
var isValidGlob = require('is-valid-glob');
var createResolver = require('resolve-options');
var assign = require('object.assign');

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

  opt = assign({}, opt);
  // TODO allow users to pass in their own cache, at their own risk?
  opt.statCache = Object.create(null);

  var streams = [
    gs(glob, opt),
    wrapVinyl(optResolver),
    resolveSymlinks(optResolver, opt.statCache),
    prepare(optResolver),
    readContents(optResolver),
    sourcemap(optResolver),
  ];

  var outputStream = pumpify.obj(streams);

  return toThrough(outputStream);
}


module.exports = src;
