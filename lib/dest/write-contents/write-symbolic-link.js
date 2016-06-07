'use strict';

var fs = require('graceful-fs');

function writeSymbolicLink(file, written) {
  // TODO handle symlinks properly
  fs.symlink(file.symlink, file.path, function(err) {
    if (isFatalError(err)) {
      return written(err);
    }

    written();
  });
}

function isFatalError(err) {
  return (err && err.code !== 'EEXIST');
}

module.exports = writeSymbolicLink;
