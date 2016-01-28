'use strict';

var fs = require('graceful-fs');

function writeBuffer(writePath, file, written) {
  var stat = file.stat;

  fs.open(writePath, file.flag, stat.mode, function(err, fd) {
    if (err) {
      return written(err);
    }

    fs.write(fd, file.contents, 0, file.contents.length, 0, function(err) {
      written(err, fd, function(err1, finish) {
        fs.close(fd, function(err2) {
          finish(err1 || err2);
        });
      });
    });
  });
}

module.exports = writeBuffer;
