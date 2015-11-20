'use strict';

var fs = require('graceful-fs');

function writeBuffer(writePath, file, cb) {
  var stat = file.stat;

  fs.open(writePath, file.flag, stat.mode, function(err, fd) {
    if (err) {
      return cb(err);
    }

    fs.write(fd, file.contents, 0, file.contents.length, 0, complete);

    // Cleanup
    function complete(err1) {
      fs.close(fd, function(err2) {
        cb(err1 || err2);
      });
    }
  });
}

module.exports = writeBuffer;
