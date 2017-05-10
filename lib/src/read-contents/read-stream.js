'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom-stream');
var lazystream = require('lazystream');

var options = require('../../options');

function streamFile(file, onRead) {
  var filePath = file.path;

  file.contents = new lazystream.Readable(function() {
    return fs.createReadStream(filePath);
  });

  if (options.get(file, 'stripBOM')) {
    file.contents = file.contents.pipe(stripBom());
  }

  onRead();
}

module.exports = streamFile;
