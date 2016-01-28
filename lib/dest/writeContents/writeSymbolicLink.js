'use strict';

var fs = require('graceful-fs');

function writeSymbolicLink(writePath, file, written) {
  fs.symlink(file.symlink, writePath, function(err) {
    if (err && err.code !== 'EEXIST') {
      return cb(err);
    }

    written();
  });
}

module.exports = writeSymbolicLink;
