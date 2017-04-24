'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom-stream');
var lazystream = require('lazystream');

var valueOrFunction = require('value-or-function');
var defaultTo = require('lodash.defaultto');

var boolean = valueOrFunction.boolean;

function streamFile(file, opt, onRead) {
  if (typeof opt === 'function') {
    onRead = opt;
    opt = {};
  }

  var filePath = file.path;

  file.contents = new lazystream.Readable(function() {
    return fs.createReadStream(filePath);
  });

  if (defaultTo(boolean(opt.stripBOM, file), true)) {
    file.contents = file.contents.pipe(stripBom());
  }

  onRead();
}

module.exports = streamFile;
