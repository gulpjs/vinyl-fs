'use strict';

var fs = require('graceful-fs');

function writeBuffer(writePath, file, cb) {
  var opt = {
    mode: file.stat.mode
  };

  try {
    fs.writeFileSync(writePath, file.contents, opt);
  } catch (err) {
    return cb(err);
  }

  cb();
}

module.exports = writeBuffer;
