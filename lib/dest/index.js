'use strict';

var through2 = require('through2');
var sourcemaps = require('gulp-sourcemaps');
var duplexify = require('duplexify');
var prepareWrite = require('../prepareWrite');
var writeContents = require('./writeContents');

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

  var saveStream = through2.obj(saveFile);
  if (!opt.sourcemaps) {
    return saveStream;
  }

  var sourcemapOpt = opt.sourcemaps;
  if (typeof sourcemapOpt === 'boolean') {
    sourcemapOpt = { sourcemaps: sourcemapOpt };
  }

  var mapStream = sourcemaps.write(sourcemapOpt.path, sourcemapOpt);
  var outputStream = duplexify.obj(mapStream, saveStream);
  mapStream.pipe(saveStream);

  return outputStream;
}

module.exports = dest;
