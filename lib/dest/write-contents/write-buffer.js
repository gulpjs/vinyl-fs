'use strict';

var iconv = require('iconv-lite');

var fo = require('../../file-operations');
var getCodec = require('../../codecs');

function writeBuffer(file, optResolver, onWritten) {
  var encoding = optResolver.resolve('encoding', file);
  var codec = getCodec(encoding);
  if (encoding && !codec) {
    return onWritten(new Error('Unsupported encoding: ' + encoding));
  }

  var opt = {
    mode: file.stat.mode,
    flag: optResolver.resolve('flag', file),
  };

  var contents = file.contents;

  if (encoding && codec.enc !== 'utf8') {
    contents = iconv.decode(contents, 'utf8', { stripBOM: false });
    contents = iconv.encode(contents, encoding);
  }

  fo.writeFile(file.path, contents, opt, onWriteFile);

  function onWriteFile(writeErr, fd) {
    if (writeErr) {
      return fo.closeFd(writeErr, fd, onWritten);
    }

    fo.updateMetadata(fd, file, onUpdate);

    function onUpdate(updateErr) {
      fo.closeFd(updateErr, fd, onWritten);
    }
  }

}

module.exports = writeBuffer;
