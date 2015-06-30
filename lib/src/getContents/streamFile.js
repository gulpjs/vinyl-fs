'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

function streamFile(file, opt, cb) {
  file.contents = fs.createReadStream(file.path);
  if (opt.stripBOM) {
    file.contents = file.contents.pipe(stripBom.stream());
  }
  cb(null, file);
}

module.exports = streamFile;
