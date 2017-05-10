'use strict';

var through = require('through2');

var writeDir = require('./write-dir');
var writeStream = require('./write-stream');
var writeBuffer = require('./write-buffer');
var writeSymbolicLink = require('./write-symbolic-link');

var fo = require('../../file-operations');
var options = require('../../options');

function writeContents() {

  function writeFile(file, enc, callback) {
    // If directory then mkdirp it
    if (file.isDirectory()) {
      return writeDir(file, onWritten);
    }

    // Stream it to disk yo
    if (file.isStream()) {
      return writeStream(file, onWritten);
    }

    // Write it as a symlink
    if (file.symlink) {
      return writeSymbolicLink(file, onWritten);
    }

    // Write it like normal
    if (file.isBuffer()) {
      return writeBuffer(file, onWritten);
    }

    // If no contents then do nothing
    if (file.isNull()) {
      return onWritten();
    }

    // This is invoked by the various writeXxx modules when they've finished
    // writing the contents.
    function onWritten(writeErr) {
      var flag = options.get(file, 'flag');
      if (fo.isFatalOverwriteError(writeErr, flag)) {
        return callback(writeErr);
      }

      callback(null, file);
    }

  }

  return through.obj(writeFile);
}

module.exports = writeContents;
