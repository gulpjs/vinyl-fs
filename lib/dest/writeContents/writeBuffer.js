'use strict';

var fs = require('graceful-fs');

function writeBuffer(writePath, file, cb) {
  var stat = file.stat;

  var opt = {
    mode: stat.mode,
    flag: file.flag
  };

  fs.writeFile(writePath, file.contents, opt, function(error)
  {
    if(error)
    {
      return cb(error);
    }

    if(stat.mtime)
    {
      stat.atime = stat.atime || new Date();

      return fs.utimes(writePath, stat.atime, stat.mtime, cb);
    }

    cb();
  });
}

module.exports = writeBuffer;
