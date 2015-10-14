'use strict';

var streamFile = require('../../src/getContents/streamFile');
var fs = require('graceful-fs');

function writeStream(writePath, file, cb) {
  var stat = file.stat;

  var opt = {
    mode: stat.mode,
    flag: file.flag
  };

  var outStream = fs.createWriteStream(writePath, opt);

  file.contents.once('error', complete);
  outStream.once('error', complete);
  outStream.once('finish', success);

  file.contents.pipe(outStream);

  function success() {
    streamFile(file, {}, function(error)
    {
      if(error)
      {
        return complete(error);
      }

      if(stat.mtime)
      {
        stat.atime = stat.atime || new Date();

        return fs.utimes(writePath, stat.atime, stat.mtime, complete);
      }

      complete();
    });
  }

  // cleanup
  function complete(err) {
    file.contents.removeListener('error', cb);
    outStream.removeListener('error', cb);
    outStream.removeListener('finish', success);
    cb(err);
  }
}

module.exports = writeStream;
