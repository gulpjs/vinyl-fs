'use strict';

var _ = require('lodash');
var defaults = _.defaults;

var duplex = require('duplexer2');
var through = require('through2');
var gs = require('glob-stream');
var File = require('vinyl');

var getContents = require('./getContents');
var getStats = require('./getStats');

function createFile (globFile, enc, cb) {
  cb(null, new File(globFile));
}

function src(glob, opt) {
  var pass = through.obj();

  if (!isValidGlob(glob)) {
    throw new Error('Invalid glob argument: ' + glob);
  }
  // return dead stream if empty array
  if (Array.isArray(glob) && glob.length === 0) {
    process.nextTick(pass.end.bind(pass));
    return pass;
  }

  var options = defaults({}, opt, {
    read: true,
    buffer: true
  });

  var globStream = gs.create(glob, options);

  // when people write to use just pass it through
  var outputStream = globStream
    .pipe(through.obj(createFile))
    .pipe(getStats(options));

  if (options.read !== false) {
    outputStream = outputStream
      .pipe(getContents(options));
  }

  outputStream = outputStream.pipe(pass);

  return duplex(pass, outputStream);
}

function isValidGlob(glob) {
  if (typeof glob === 'string') {
    return true;
  }
  return false;
}

module.exports = src;
