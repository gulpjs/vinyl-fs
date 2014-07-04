'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

function bufferFile(file, cb) {
  var data;
  try {
    data = fs.readFileSync(file.path);
  } catch (err) {
    return cb(err);
  }

  file.contents = stripBom(data);
  cb(null, file);
}

module.exports = bufferFile;
