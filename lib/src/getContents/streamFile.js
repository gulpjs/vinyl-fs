'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom-stream');

function streamFile(file, opt, cb) {
  file.contents = fs.createReadStream(file.path)
    .pipe(stripBom());
  cb(null, file);
}

module.exports = streamFile;
