'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

function bufferFile(file, opt, onRead) {
  fs.readFile(file.path, onReadFile);

  function onReadFile(readErr, data) {
    if (readErr) {
      return onRead(readErr);
    }

    if (opt.stripBOM) {
      file.contents = stripBom(data);
    } else {
      file.contents = data;
    }

    onRead();
  }
}

module.exports = bufferFile;
