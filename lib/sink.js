'use strict';

var Writable = require('readable-stream/writable');

function listenerCount(stream, evt) {
  return stream.listeners(evt).length;
}

function sink(stream) {
  var sinkStream = new Writable({
    objectMode: true,
    write: function(file, enc, cb) {
      cb();
    },
  });

  function removeSink(evt) {
    if (evt !== 'readable' && evt !== 'data') {
      return;
    }

    if (listenerCount(stream, 'readable') || listenerCount(stream, 'data')) {
      stream.unpipe(sinkStream);
    }
  }

  stream.on('newListener', removeSink);
  stream.on('removeListener', removeSink);

  return function() {
    if (listenerCount(stream, 'readable') || listenerCount(stream, 'data')) {
      return;
    }

    stream.pipe(sinkStream);
  };
}

module.exports = sink;
