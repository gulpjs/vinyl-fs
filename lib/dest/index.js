'use strict';

var pumpify = require('pumpify');
var prepare = require('vinyl-prepare');

var sink = require('../sink');
var saveFile = require('./save-file');

function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  var saveStream = pumpify.obj(
    prepare.dest(outFolder, opt),
    saveFile(opt)
  );

  // Sink the output stream to start flowing
  // Do this on nextTick, it will flow at slowest speed of piped streams
  process.nextTick(sink(saveStream));

  return saveStream;
}

module.exports = dest;
