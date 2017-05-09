'use strict';

var through = require('through2');
var sourcemap = require('vinyl-sourcemap');

var options = require('../options');

function sourcemapStream() {

  function saveSourcemap(file, enc, callback) {
    var self = this;

    var sourcemapsOpt = options.get(file, 'sourcemaps');

    if (!sourcemapsOpt) {
      return callback(null, file);
    }

    var srcMapLocation;
    if (typeof sourcemapsOpt === 'string') {
      srcMapLocation = sourcemapsOpt;
    }

    sourcemap.write(file, srcMapLocation, onWrite);

    function onWrite(sourcemapErr, updatedFile, sourcemapFile) {
      if (sourcemapErr) {
        return callback(sourcemapErr);
      }

      self.push(updatedFile);
      if (sourcemapFile) {
        self.push(sourcemapFile);
      }

      callback();
    }
  }

  return through.obj(saveSourcemap);
}

module.exports = sourcemapStream;
