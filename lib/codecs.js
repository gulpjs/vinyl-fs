var iconv = require('iconv-lite');

var cache = {
  utf8: iconv.getCodec('utf8'),
};

function getCodec(encoding) {
  var codec = cache[encoding];
  if (!!codec || !encoding || cache.hasOwnProperty(encoding)) {
    return codec;
  }

  try {
    codec = iconv.getCodec(encoding);
  } catch (err) {
    // Unsupported codec
  }

  cache[encoding] = codec;
  return codec;
}

module.exports = getCodec;
