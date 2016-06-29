'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

function bufferFile(file, opt, onRead) {
  fs.readFile(file.path, function(err, data) {
    if (err) {
      return onRead(err);
    }

    if (opt.stripBOM) {
      file.contents = stripBom(data);
    } else {
      file.contents = data;
    }

    onRead(null);
  });
}

module.exports = bufferFile;
