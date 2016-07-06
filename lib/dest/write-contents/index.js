'use strict';

var writeDir = require('./write-dir');
var writeStream = require('./write-stream');
var writeBuffer = require('./write-buffer');
var writeSymbolicLink = require('./write-symbolic-link');

function writeContents(file, callback) {
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
    if (isErrorFatal(writeErr)) {
      return callback(writeErr);
    }

    callback(null, file);
  }

  function isErrorFatal(err) {
    if (!err) {
      return false;
    }

    if (err.code === 'EEXIST' && file.flag === 'wx') {
      // Handle scenario for file overwrite failures.
      return false;
    }

    // Otherwise, this is a fatal error
    return true;
  }
}

module.exports = writeContents;
