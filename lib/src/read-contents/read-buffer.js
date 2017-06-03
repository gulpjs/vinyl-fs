'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

function bufferFile(file, optResolver, onRead) {
  fs.readFile(file.path, onReadFile);

  function onReadFile(readErr, data) {
    if (readErr) {
      return onRead(readErr);
    }

    var stripBOM = optResolver.resolve('stripBOM', file);
    if (stripBOM) {
      file.contents = stripBom(data);
    } else {
      file.contents = data;
    }

    onRead();
  }
}

module.exports = bufferFile;
