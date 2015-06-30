'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

function bufferFile(file, opt, cb) {
  fs.readFile(file.path, function(err, data) {
    if (err) {
      return cb(err);
    }
    file.contents = opt.stripBOM ? stripBom(data) : data;
    cb(null, file);
  });
}

module.exports = bufferFile;
