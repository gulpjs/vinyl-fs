'use strict';

var fs = require('graceful-fs');

var streamFile = require('../../src/getContents/streamFile');
var futimes    = require('../../futimes');

function writeStream(writePath, file, cb) {
  var stat = file.stat;
  var mode = stat.mode;

  var outStream;
  var outFD;

  fs.open(writePath, 'w', mode, function(err, fd) {
    if (err) {
      cb(err);
    }

    var opt = {
      mode: mode,
      flag: file.flag,
      autoClose: false,
      fd: fd,
    };

    outFD = fd;
    outStream = fs.createWriteStream(null, opt);

    file.contents.once('error', complete);
    file.contents.once('end', readStreamEnd);
    outStream.once('error', complete);
    outStream.once('finish', complete);

    // Streams are piped with end disabled, this prevents the
    // WriteStream from closing the file descriptor after all
    // data is written.
    file.contents.pipe(outStream, { end: false });
  });

  function readStreamEnd() {
    streamFile(file, {}, function(error) {
      if (error) {
        return complete(error);
      }

      futimes(outFD, stat, function(error) {
        if (error) {
          return complete(error);
        }

        // All finished with WriteStream, close and clean up
        outStream.end();
      });
    });
  }

  // Cleanup
  function complete(err) {
    file.contents.removeListener('error', complete);
    file.contents.removeListener('end', readStreamEnd);
    if (outStream) {
      outStream.removeListener('error', complete);
      outStream.removeListener('finish', complete);
    }
    cb(err, outFD);
  }
}

module.exports = writeStream;
