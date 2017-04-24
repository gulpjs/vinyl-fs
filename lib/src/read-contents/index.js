'use strict';

var through2 = require('through2');
var readDir = require('./read-dir');
var readStream = require('./read-stream');
var readBuffer = require('./read-buffer');
var readSymbolicLink = require('./read-symbolic-link');

function readContents(opt) {

  function readFile(file, enc, callback) {
    // Don't fail to read a directory
    if (file.isDirectory()) {
      return readDir(file, opt, onRead);
    }

    // Process symbolic links included with `followSymlinks` option
    if (file.stat && file.stat.isSymbolicLink()) {
      return readSymbolicLink(file, opt, onRead);
    }

    // Read and pass full contents
    if (opt.buffer !== false) {
      return readBuffer(file, opt, onRead);
    }

    // Don't buffer anything - just pass streams
    return readStream(file, opt, onRead);

    // This is invoked by the various readXxx modules when they've finished
    // reading the contents.
    function onRead(readErr) {
      callback(readErr, file);
    }
  }

  return through2.obj(opt, readFile);
}

module.exports = readContents;
