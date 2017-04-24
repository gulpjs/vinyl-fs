'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

var valueOrFunction = require('value-or-function');
var koalas = require('koalas');

var boolean = valueOrFunction.boolean;

function bufferFile(file, opt, onRead) {
  fs.readFile(file.path, onReadFile);

  function onReadFile(readErr, data) {
    if (readErr) {
      return onRead(readErr);
    }

    if (koalas(boolean(opt.stripBOM, file), true)) {
      file.contents = stripBom(data);
    } else {
      file.contents = data;
    }

    onRead();
  }
}

module.exports = bufferFile;
