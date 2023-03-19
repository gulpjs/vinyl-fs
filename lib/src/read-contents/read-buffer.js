'use strict';

var fs = require('graceful-fs');
var isUtf8 = require('is-utf8');

var getCodec = require('../../codecs');
var DEFAULT_ENCODING = require('../../constants').DEFAULT_ENCODING;

function bufferFile(file, optResolver, onRead) {
  var encoding = optResolver.resolve('encoding', file);
  var codec = getCodec(encoding);
  if (encoding && !codec) {
    return onRead(new Error('Unsupported encoding: ' + encoding));
  }

  fs.readFile(file.path, onReadFile);

  function onReadFile(readErr, contents) {
    if (readErr) {
      return onRead(readErr);
    }

    if (encoding) {
      var removeBOM = codec.bomAware && optResolver.resolve('removeBOM', file);

      if (codec.enc !== DEFAULT_ENCODING) {
        contents = codec.decode(contents);
        removeBOM = removeBOM && contents[0] === '\ufeff';
        contents = getCodec(DEFAULT_ENCODING).encode(contents);
      }

      if (removeBOM && hasBOM(contents) && isUtf8(contents)) {
        contents = contents.slice(3);
      }
    }

    file.contents = contents;

    onRead();
  }
}

function hasBOM(buffer) {
  return (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf);
}

module.exports = bufferFile;
