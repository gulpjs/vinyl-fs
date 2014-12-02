'use strict';

var assign = require('object-assign');
var through = require('through2');
var gs = require('glob-stream');
var File = require('vinyl');

var getContents = require('./getContents');
var getStats = require('./getStats');

function createFile (globFile, enc, cb) {
  cb(null, new File(globFile));
}

function filterSince (since) {
  return function (file, enc, cb) {
    if (+file.stat.mtime >= since) {
      return cb(null, file);
    }
    cb();
  };
}

function src(glob, opt) {
  opt = opt || {};
  var pass = through.obj();

  if (!isValidGlob(glob)) {
    throw new Error('Invalid glob argument: ' + glob);
  }
  // return dead stream if empty array
  if (Array.isArray(glob) && glob.length === 0) {
    process.nextTick(pass.end.bind(pass));
    return pass;
  }

  var options = assign({
    read: true,
    buffer: true
  }, opt);

  var globStream = gs.create(glob, options);

  // when people write to use just pass it through
  var outputStream = globStream
    .pipe(through.obj(createFile))
    .pipe(getStats(options));

  if (options.since && (options.since instanceof Date)) {
    outputStream = outputStream
      .pipe(through.obj(filterSince(options.since)));
  }

  if (options.read !== false) {
    outputStream = outputStream
      .pipe(getContents(options));
  }

  return outputStream.pipe(pass);
}

function isValidGlob(glob) {
  if (typeof glob === 'string') {
    return true;
  }
  if (Array.isArray(glob) && glob.length !== 0) {
    return glob.every(isValidGlob);
  }
  if (Array.isArray(glob) && glob.length === 0) {
    return true;
  }
  return false;
}

module.exports = src;
