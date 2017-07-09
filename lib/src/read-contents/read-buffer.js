'use strict';

var fs = require('graceful-fs');
var removeBomBuffer = require('remove-bom-buffer');

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

      if (removeBOM) {
        contents = removeBomBuffer(contents);
      }
    }

    file.contents = contents;

    onRead();
  }
}

module.exports = bufferFile;
