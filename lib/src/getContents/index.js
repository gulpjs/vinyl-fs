'use strict';

var map = require('map-stream');

var readDir = require('./readDir');
var bufferFile = require('./bufferFile');
var streamFile = require('./streamFile');

function getContents(opt) {
  return map(function (file, cb) {
    // don't fail to read a directory
    if (file.isDirectory()) {
      return readDir(file, cb);
    }

    // read and pass full contents
    if (opt.buffer !== false) {
      return bufferFile(file, cb);
    }

    // dont buffer anything - just pass streams
    return streamFile(file, cb);
  });
}

module.exports = getContents;
