'use strict';

var fs = require('graceful-fs');

var fo = require('../../file-operations');

function writeSymbolicLink(file, optResolver, onWritten) {
  // TODO handle symlinks properly
  fs.symlink(file.symlink, file.path, function(symlinkErr) {
    if (fo.isFatalOverwriteError(symlinkErr)) {
      return onWritten(symlinkErr);
    }

    onWritten();
  });
}

module.exports = writeSymbolicLink;
