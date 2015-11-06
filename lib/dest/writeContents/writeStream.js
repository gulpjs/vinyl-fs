'use strict';

var fs = require('graceful-fs');

var streamFile = require('../../src/getContents/streamFile');
var futimes    = require('../../futimes');

function writeStream(writePath, file, cb) {
  var stat = file.stat;

  var opt = {
    mode: stat.mode,
    flag: file.flag
  };

  var outStream = fs.createWriteStream(writePath, opt);
  var outFD;

  file.contents.once('error', complete);
  outStream.once('error', complete);
  outStream.once('open', open );
  outStream.once('finish', success);

  file.contents.pipe(outStream);

  function open(fd) {
    outFD = fd;
  }

  function success() {
    streamFile(file, {}, function(error) {
      if (error) {
        return complete(error);
      }

      futimes(outFD, stat, complete);
    });
  }

  // cleanup
  function complete(err) {
    file.contents.removeListener('error', complete);
    outStream.removeListener('error', complete);
    outStream.removeListener('open', open);
    outStream.removeListener('finish', success);
    cb(err);
  }
}

module.exports = writeStream;
