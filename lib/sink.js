'use strict';

var Writable = require('readable-stream/writable');

function sink(stream) {
  var sinkStream = new Writable({
    objectMode: true,
    write: function(file, enc, cb) {
      cb();
    },
  });

  return function() {
    // Respect readable listeners on the underlying stream
    if (stream.listeners('readable').length > 0) {
      return;
    }

    stream.pipe(sinkStream);
  };
}

module.exports = sink;
