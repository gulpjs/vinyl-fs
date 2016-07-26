'use strict';

var through = require('through2');
var sourcemap = require('vinyl-sourcemap');
var valueOrFunction = require('value-or-function');

var stringOrBool = valueOrFunction.bind(null, ['string', 'boolean']);

function sourcemapStream(opt) {

  function saveSourcemap(file, enc, callback) {
    var self = this;

    var srcMap = stringOrBool(opt.sourcemaps, file);

    if (!srcMap) {
      return callback(null, file);
    }

    var srcMapLocation = (typeof srcMap === 'string' ? srcMap : undefined);

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
