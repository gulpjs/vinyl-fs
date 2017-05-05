'use strict';

var through = require('through2');
var valueOrFunction = require('value-or-function');
var koalas = require('koalas');

var readDir = require('./read-dir');
var readStream = require('./read-stream');
var readBuffer = require('./read-buffer');
var readSymbolicLink = require('./read-symbolic-link');

var boolean = valueOrFunction.boolean;

function readContents(opt) {

  function readFile(file, enc, callback) {

    // Skip reading contents if read option says so
    if (!koalas(boolean(opt.readFile, file), true)) {
      return callback(null, file);
    }

    // Don't fail to read a directory
    if (file.isDirectory()) {
      return readDir(file, opt, onRead);
    }

    // Process symbolic links included with `resolveSymlinks` option
    if (file.stat && file.stat.isSymbolicLink()) {
      return readSymbolicLink(file, opt, onRead);
    }

    // Read and pass full contents
    if (koalas(boolean(opt.buffer, file), true)) {
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

  return through.obj(opt, readFile);
}

module.exports = readContents;
