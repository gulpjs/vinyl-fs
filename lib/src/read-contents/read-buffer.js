'use strict';

var fs = require('graceful-fs');
var iconv = require('iconv-lite');
var removeBomBuffer = require('remove-bom-buffer');

var getCodec = require('../../codecs');

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

      if (codec.enc !== 'utf8') {
        contents = iconv.decode(contents, encoding, { stripBOM: false });
        removeBOM = removeBOM && contents[0] === '\ufeff';
        contents = iconv.encode(contents, 'utf8');
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
