'use strict';

var through = require('through2');

var readDir = require('./read-dir');
var readStream = require('./read-stream');
var readBuffer = require('./read-buffer');
var readSymbolicLink = require('./read-symbolic-link');
var options = require('../../options');

function readContents() {

  function readFile(file, enc, callback) {

    // Skip reading contents if read option says so
    if (!options.get(file, 'read')) {
      return callback(null, file);
    }

    // Don't fail to read a directory
    if (file.isDirectory()) {
      return readDir(file, onRead);
    }

    // Process symbolic links included with `resolveSymlinks` option
    if (file.stat && file.stat.isSymbolicLink()) {
      return readSymbolicLink(file, onRead);
    }

    // Read and pass full contents
    if (options.get(file, 'buffer')) {
      return readBuffer(file, onRead);
    }

    // Don't buffer anything - just pass streams
    return readStream(file, onRead);

    // This is invoked by the various readXxx modules when they've finished
    // reading the contents.
    function onRead(readErr) {
      callback(readErr, file);
    }
  }

  return through.obj(readFile);
}

module.exports = readContents;
