'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');
var stripBomBuffer = require('strip-bom-buf');

function bufferFile(file, opt, cb) {
  fs.readFile(file.path, function(err, data) {
    if (err) {
      return cb(err);
    }

    if (opt.stripBOM) {
      if (typeof data !== 'string') {
        file.contents = stripBomBuffer(data);
      } else {
        file.contents = stripBom(data);
      }
    } else {
      file.contents = data;
    }

    cb(null, file);
  });
}

module.exports = bufferFile;
