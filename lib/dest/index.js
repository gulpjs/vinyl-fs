'use strict';

var lead = require('lead');
var pumpify = require('pumpify');
var prepare = require('vinyl-prepare');

var sourcemap = require('./sourcemap');
var makeDirs = require('./make-dirs');
var writeContents = require('./write-contents');

function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  var saveStream = pumpify.obj(
    prepare.dest(outFolder, opt),
    sourcemap(opt),
    makeDirs(opt),
    writeContents(opt)
  );

  // Sink the output stream to start flowing
  return lead(saveStream);
}

module.exports = dest;
