'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

function bufferFile(file, opt, cb) {
  fs.readFile(file.path, opt, function(err, data) {
    if (err) {
      return cb(err);
    }
    // if user specifies encoding type, a string is returned
    // so we need to convert it back to buffer
    if (!Buffer.isBuffer(data) && typeof data === 'string') {
        file.contents = stripBom(new Buffer(data, opt.encoding));
    } else {
        file.contents = stripBom(data);
    }
    cb(null, file);
  });
}

module.exports = bufferFile;
