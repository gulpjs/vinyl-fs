'use strict';

var through = require('through2');
var sourcemap = require('vinyl-sourcemap');
var valueOrFunction = require('value-or-function');

var boolean = valueOrFunction.boolean;

function sourcemapStream(opt) {

  function addSourcemap(file, enc, callback) {
    var srcMap = boolean(opt.sourcemaps, file);

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
