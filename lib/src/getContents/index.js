'use strict';

var through2 = require('through2');

var readDir = require('./readDir');
var bufferFile = require('./bufferFile');
var streamFile = require('./streamFile');

function getContents(opt) {
  return through2.obj(function (file, enc, done) {
    // don't fail to read a directory
    if (file.isDirectory()) {
      return readDir(file, done);
    }

    // read and pass full contents
    if (opt.buffer !== false) {
      return bufferFile(file, done);
    }

    // dont buffer anything - just pass streams
    return streamFile(file, done);
  });
}

module.exports = getContents;
