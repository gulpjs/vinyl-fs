'use strict';

var Transform = require('streamx').Transform;

function prepareRead(optResolver) {
  function normalize(file, callback) {
    var since = optResolver.resolve('since', file);

    // Skip this file if since option is set and current file is too old
    if (file.stat && file.stat.mtime <= since) {
      return callback();
    }

    return callback(null, file);
  }

  return new Transform({
    transform: normalize,
  });
}

module.exports = prepareRead;
