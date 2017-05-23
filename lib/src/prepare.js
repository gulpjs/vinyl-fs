'use strict';

var through = require('through2');
var valueOrFunction = require('value-or-function');

var date = valueOrFunction.date;

function prepareRead(opt) {
  if (!opt) {
    opt = {};
  }

  function normalize(file, enc, callback) {

    // Skip this file if since option is set and current file is too old
    if (opt.since != null) {
      var since = date(opt.since, file);
      if (since === null) {
        return callback(new Error('Invalid since option'));
      }
      if (file.stat && file.stat.mtime <= since) {
        return callback();
      }
    }

    return callback(null, file);
  }

  return through.obj(normalize);
}

module.exports = prepareRead;
