'use strict';

var fs = require('graceful-fs');
var iconv = require('iconv-lite');
var removeBomStream = require('remove-bom-stream');
var lazystream = require('lazystream');

var getCodec = require('../../codecs');

function streamFile(file, optResolver, onRead) {
  var encoding = optResolver.resolve('encoding', file);
  var codec = getCodec(encoding);
  if (encoding && !codec) {
    return onRead(new Error('Unsupported encoding: ' + encoding));
  }

  var filePath = file.path;

  file.contents = new lazystream.Readable(function() {
    var contents = fs.createReadStream(filePath);

    if (encoding) {
      var removeBOM = codec.bomAware && optResolver.resolve('removeBOM', file);

      if (codec.enc !== 'utf8') {
        contents = contents
          .pipe(iconv.decodeStream(encoding, { stripBOM: false }))
          .pipe(iconv.encodeStream('utf8'));
      }

      if (removeBOM) {
        contents = contents.pipe(removeBomStream());
      }
    }

    return contents;
  });

  onRead();
}

module.exports = streamFile;
