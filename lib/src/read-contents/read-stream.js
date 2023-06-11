'use strict';

var fs = require('graceful-fs');
var composer = require('stream-composer');
var lazystream = require('lazystream');

var getCodec = require('../../codecs');
var DEFAULT_ENCODING = require('../../constants').DEFAULT_ENCODING;

function streamFile(file, optResolver, onRead) {
  var encoding = optResolver.resolve('encoding', file);
  var codec = getCodec(encoding);
  if (encoding && !codec) {
    return onRead(new Error('Unsupported encoding: ' + encoding));
  }

  var filePath = file.path;

  file.contents = new lazystream.Readable(function () {
    var contents = fs.createReadStream(filePath);

    var streams = [contents];

    if (encoding) {
      var removeBOM = codec.bomAware && optResolver.resolve('removeBOM', file);

      if (removeBOM || codec.enc !== DEFAULT_ENCODING) {
        streams.push(codec.decodeStream({ removeBOM: removeBOM }));
        streams.push(getCodec(DEFAULT_ENCODING).encodeStream());
      }
    }

    if (streams.length > 1) {
      return composer.pipeline(streams);
    } else {
      return contents;
    }
  });

  onRead();
}

module.exports = streamFile;
