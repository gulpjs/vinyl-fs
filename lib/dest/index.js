'use strict';

var lead = require('lead');
var pumpify = require('pumpify');
var prepare = require('vinyl-prepare');

var saveFile = require('./save-file');
var sourcemap = require('./sourcemap');

function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  var saveStream = pumpify.obj(
    prepare.dest(outFolder, opt),
    sourcemap(opt),
    saveFile(opt)
  );

  // Sink the output stream to start flowing
  return lead(saveStream);
}

module.exports = dest;
