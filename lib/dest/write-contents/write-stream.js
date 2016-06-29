'use strict';

var fs = require('graceful-fs');

var fo = require('../../file-operations');
var readStream = require('../../src/get-contents/read-stream');

function writeStream(file, written) {
  var opt = {
    mode: file.stat.mode,
    flag: file.flag,
  };

  var outStream = fs.createWriteStream(file.path, opt);
  var fd = null;

  file.contents.once('error', complete);
  file.contents.once('end', readStreamEnd);
  outStream.once('error', complete);
  outStream.once('finish', complete);
  outStream.once('open', onOpen);

  // Streams are piped with end disabled, this prevents the
  // WriteStream from closing the file descriptor after all
  // data is written.
  file.contents.pipe(outStream, { end: false });

  // Obtain the file descriptor from the "open" event.
  function onOpen(openFd) {
    fd = openFd;
  }

  function readStreamEnd() {
    readStream(file, complete);
  }

  function end(propagatedErr) {
    outStream.end(onEnd);

    function onEnd(endErr) {
      written(propagatedErr || endErr);
    }
  }

  // Cleanup
  function complete(streamErr) {
    file.contents.removeListener('error', complete);
    file.contents.removeListener('end', readStreamEnd);
    outStream.removeListener('error', complete);
    outStream.removeListener('finish', complete);
    outStream.removeListener('open', onOpen);

    if (streamErr) {
      return end(streamErr);
    }

    if (typeof fd !== 'number') {
      return end();
    }

    fo.updateMetadata(fd, file, end);
  }
}

module.exports = writeStream;
