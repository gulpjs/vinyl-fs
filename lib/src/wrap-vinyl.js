'use strict';

var through = require('through2');
var File = require('vinyl');

function wrapVinyl() {

  function wrapFile(globFile, enc, callback) {
    callback(null, new File(globFile));
  }

  return through.obj(wrapFile);
}

module.exports = wrapVinyl;
