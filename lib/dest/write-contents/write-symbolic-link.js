'use strict';

var fs = require('graceful-fs');

function writeSymbolicLink(file, onWritten) {
  // TODO handle symlinks properly
  fs.symlink(file.symlink, file.path, function(err) {
    if (isFatalError(err)) {
      return onWritten(err);
    }

    onWritten();
  });
}

function isFatalError(err) {
  return (err && err.code !== 'EEXIST');
}

module.exports = writeSymbolicLink;
