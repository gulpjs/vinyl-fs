'use strict';

var lead = require('lead');
var pumpify = require('pumpify');
var prepare = require('vinyl-prepare');
var mkdirpStream = require('fs-mkdirp-stream');
var number = require('value-or-function').number;

var sourcemap = require('./sourcemap');
var writeContents = require('./write-contents');

function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  function dirpath(file, callback) {
    var dirMode = number(opt.dirMode, file);

    callback(null, file.dirname, dirMode);
  }

  var saveStream = pumpify.obj(
    prepare.dest(outFolder, opt),
    sourcemap(opt),
    mkdirpStream.obj(dirpath),
    writeContents(opt)
  );

  // Sink the output stream to start flowing
  return lead(saveStream);
}

module.exports = dest;
