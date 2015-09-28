'use strict';

var through2 = require('through2');
var sourcemaps = require('gulp-sourcemaps');
var duplexify = require('duplexify');
var ternaryStream = require('ternary-stream');
var prepareWrite = require('../prepareWrite');
var writeContents = require('./writeContents');

function canSourceMap(file) {
  return file.isBuffer();
}

function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  function saveFile(file, enc, cb) {
    prepareWrite(outFolder, file, opt, function(err, writePath) {
      if (err) {
        return cb(err);
      }
      writeContents(writePath, file, cb);
    });
  }

  var mapStream = ternaryStream(canSourceMap, sourcemaps.write(opt.sourcemaps));
  var saveStream = through2.obj(saveFile);
  var outputStream = duplexify.obj(mapStream, saveStream);
  mapStream.pipe(saveStream);

  return outputStream;
}

module.exports = dest;
