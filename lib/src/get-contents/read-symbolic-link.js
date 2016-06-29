'use strict';

var fs = require('graceful-fs');

function readLink(file, opt, onRead) {
  fs.readlink(file.path, function(err, target) {
    if (err) {
      return onRead(err);
    }

    // Store the link target path
    file.symlink = target;

    return onRead(null);
  });
}

module.exports = readLink;
