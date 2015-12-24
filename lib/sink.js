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
    stream.pipe(sinkStream);
  };
}

module.exports = sink;
