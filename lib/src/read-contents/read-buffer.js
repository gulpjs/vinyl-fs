'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

var options = require('../../options');

function bufferFile(file, onRead) {
  fs.readFile(file.path, onReadFile);

  function onReadFile(readErr, data) {
    if (readErr) {
      return onRead(readErr);
    }

    if (options.get(file, 'stripBOM')) {
      file.contents = stripBom(data);
    } else {
      file.contents = data;
    }

    onRead();
  }
}

module.exports = bufferFile;
