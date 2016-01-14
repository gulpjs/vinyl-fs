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

  stream.on('removeListener', function() {
    if (listenerCount(stream, 'readable') || listenerCount(stream, 'data')) {
      stream.unpipe(sinkStream);
    }
  });

  stream.on('unpipe', function() {
    if (!(listenerCount(stream, 'readable') || listenerCount(stream, 'data'))) {
      stream.pipe(sinkStream);
    }
  });

  stream.on('newListener', function() {
    if (listenerCount(stream, 'readable') || listenerCount(stream, 'data')) {
      stream.unpipe(sinkStream);
    }
  });

  return function() {
    if (listenerCount(stream, 'readable') || listenerCount(stream, 'data')) {
      return;
    }

    stream.pipe(sinkStream);
  };
}

module.exports = sink;
