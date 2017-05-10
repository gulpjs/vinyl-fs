'use strict';

var through = require('through2');
var sourcemap = require('vinyl-sourcemap');

var options = require('../options');

function sourcemapStream() {

  function addSourcemap(file, enc, callback) {
    var srcMap = options.get(file, 'sourcemaps');

    if (!srcMap) {
      return callback(null, file);
    }

    sourcemap.add(file, onAdd);

    function onAdd(sourcemapErr, updatedFile) {
      if (sourcemapErr) {
        return callback(sourcemapErr);
      }

      callback(null, updatedFile);
    }
  }

  return through.obj(addSourcemap);
}

module.exports = sourcemapStream;
