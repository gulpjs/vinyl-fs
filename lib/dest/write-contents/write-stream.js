'use strict';

var fs = require('graceful-fs');

var fo = require('../../file-operations');
var readStream = require('../../src/get-contents/read-stream');

function writeStream(file, onWritten) {
  var opt = {
    mode: file.stat.mode,
    flag: file.flag,
  };

  var outStream = fs.createWriteStream(file.path, opt);

  file.contents.once('error', complete);
  file.contents.once('end', readStreamEnd);
  outStream.once('error', complete);
  outStream.once('finish', complete);

  // Streams are piped with end disabled, this prevents the
  // WriteStream from closing the file descriptor after all
  // data is written.
  file.contents.pipe(outStream, { end: false });

  function readStreamEnd() {
    readStream(file, complete);
  }

  function end(propagatedErr) {
    outStream.end(onEnd);

    function onEnd(endErr) {
      onWritten(propagatedErr || endErr);
    }
  }

  // Cleanup
  function complete(streamErr) {
    file.contents.removeListener('error', complete);
    file.contents.removeListener('end', readStreamEnd);
    outStream.removeListener('error', complete);
    outStream.removeListener('finish', complete);

    if (streamErr) {
      return end(streamErr);
    }

    if (typeof outStream.fd !== 'number') {
      return end();
    }

    fo.updateMetadata(outStream.fd, file, end);
  }
}

module.exports = writeStream;
