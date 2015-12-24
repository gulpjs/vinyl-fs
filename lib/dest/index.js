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

<<<<<<< HEAD
  var stream = through2.obj(options,saveFile);
  // TODO: option for either backpressure or lossy
  stream.resume();
  return stream;
=======
  var saveStream = through2.obj(opt, saveFile);
  if (!opt.sourcemaps) {
    return saveStream;
  }

  var mapStream = sourcemaps.write(opt.sourcemaps.path, opt.sourcemaps);
  var outputStream = duplexify.obj(mapStream, saveStream);
  mapStream.pipe(saveStream);

  return outputStream;
>>>>>>> 36bf33fac5165a52beea7c9f25c3b2120951883a
}

module.exports = dest;
