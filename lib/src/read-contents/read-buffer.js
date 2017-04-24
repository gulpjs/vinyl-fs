'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

var valueOrFunction = require('value-or-function');
var defaultTo = require('lodash.defaultto');

var boolean = valueOrFunction.boolean;

function bufferFile(file, opt, onRead) {
  fs.readFile(file.path, onReadFile);

  function onReadFile(readErr, data) {
    if (readErr) {
      return onRead(readErr);
    }

    if (defaultTo(boolean(opt.stripBOM, file), true)) {
      file.contents = stripBom(data);
    } else {
      file.contents = data;
    }

    onRead();
  }
}

module.exports = bufferFile;
