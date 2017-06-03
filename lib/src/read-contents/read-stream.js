'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom-stream');
var lazystream = require('lazystream');
var createResolver = require('resolve-options');

function streamFile(file, optResolver, onRead) {
  if (typeof optResolver === 'function') {
    onRead = optResolver;
    optResolver = createResolver();
  }

  var filePath = file.path;

  file.contents = new lazystream.Readable(function() {
    return fs.createReadStream(filePath);
  });

  var stripBOM = optResolver.resolve('stripBOM', file);
  if (stripBOM) {
    file.contents = file.contents.pipe(stripBom());
  }

  onRead();
}

module.exports = streamFile;
