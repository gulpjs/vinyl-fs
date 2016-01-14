'use strict';

var Writable = require('readable-stream/writable');

function listenerCount(stream, evt) {
  return stream.listeners(evt).length;
}

function hasListeners(stream) {
  return !!(listenerCount(stream, 'readable') || listenerCount(stream, 'data'));
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

    if (hasListeners(stream)) {
      stream.unpipe(sinkStream);
    }
  }

  stream.on('newListener', removeSink);
  stream.on('removeListener', removeSink);

  return function() {
    if (hasListeners(stream)) {
      return;
    }

    stream.pipe(sinkStream);
  };
}

module.exports = sink;
