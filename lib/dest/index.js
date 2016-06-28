'use strict';

var through2 = require('through2');
var sourcemaps = require('gulp-sourcemaps');
var duplexify = require('duplexify');
var valueOrFunction = require('value-or-function');

var sink = require('../sink');
var prepareWrite = require('../prepare-write');
var writeContents = require('./write-contents');

function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  var sourcemapsOpt = valueOrFunction(
      ['boolean', 'string', 'object'], opt.sourcemaps);

  function saveFile(file, enc, cb) {
    prepareWrite(outFolder, file, opt, function(err, writePath) {
      if (err) {
        return cb(err);
      }
      writeContents(writePath, file, cb);
    });
  }

  var saveStream = through2.obj(opt, saveFile);
  if (!sourcemapsOpt) {
    // Sink the save stream to start flowing
    // Do this on nextTick, it will flow at slowest speed of piped streams
    process.nextTick(sink(saveStream));

    return saveStream;
  }

  if (typeof sourcemapsOpt === 'boolean') {
    sourcemapsOpt = {};
  } else if (typeof sourcemapsOpt === 'string') {
    sourcemapsOpt = {
      path: sourcemapsOpt,
    };
  }

  var mapStream = sourcemaps.write(sourcemapsOpt.path, sourcemapsOpt);
  var outputStream = duplexify.obj(mapStream, saveStream);
  mapStream.pipe(saveStream);

  // Sink the output stream to start flowing
  // Do this on nextTick, it will flow at slowest speed of piped streams
  process.nextTick(sink(outputStream));

  return outputStream;
}

module.exports = dest;
