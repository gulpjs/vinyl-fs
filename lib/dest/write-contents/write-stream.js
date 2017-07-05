'use strict';

var iconv = require('iconv-lite');
var createResolver = require('resolve-options');

var fo = require('../../file-operations');
var getCodec = require('../../codecs');
var readStream = require('../../src/read-contents/read-stream');
var readConfig = require('../../src/options');

function writeStream(file, optResolver, onWritten) {
  var encoding = optResolver.resolve('encoding', file);
  var codec = getCodec(encoding);
  if (encoding && !codec) {
    return onWritten(new Error('Unsupported encoding: ' + encoding));
  }

  var opt = {
    mode: file.stat.mode,
    // TODO: need to test this (node calls this `flags` property)
    flag: optResolver.resolve('flag', file),
  };

  // TODO: is this the best API?
  var outStream = fo.createWriteStream(file.path, opt, onFlush);

  var contents = file.contents;

  if (encoding && encoding.enc !== 'utf8') {
    contents = contents
      .pipe(iconv.decodeStream('utf8', { stripBOM: false }))
      .pipe(iconv.encodeStream(encoding));
  }

  file.contents.once('error', onComplete);
  outStream.once('error', onComplete);
  outStream.once('finish', onComplete);

  // TODO: should this use a clone?
  contents.pipe(outStream);

  function onComplete(streamErr) {
    // Cleanup event handlers before closing
    file.contents.removeListener('error', onComplete);
    outStream.removeListener('error', onComplete);
    outStream.removeListener('finish', onComplete);

    // Need to guarantee the fd is closed before forwarding the error
    outStream.once('close', onClose);
    outStream.end();

    function onClose(closeErr) {
      onWritten(streamErr || closeErr);
    }
  }

  // Cleanup
  function onFlush(fd, callback) {
    // TODO: removing this before readStream because it replaces the stream
    file.contents.removeListener('error', onComplete);

    // TODO: this is doing sync stuff & the callback seems unnecessary
    readStream(file, createResolver(readConfig, {
      encoding: encoding,
      removeBOM: false,
    }), complete);

    function complete() {
      if (typeof fd !== 'number') {
        return callback();
      }

      fo.updateMetadata(fd, file, callback);
    }
  }

}

module.exports = writeStream;
