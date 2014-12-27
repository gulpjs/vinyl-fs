'use strict';

var through2 = require('through2');
var prepDestAndResponse = require('../common').prepDestAndResponse;

var writeContents = require('./writeContents');


function dest(outFolder, opt) {
  function saveFile (file, enc, cb) {
    prepDestAndResponse(outFolder, file, opt, function (err, writePath) {
      if (err) {
        return cb(err);
      }

      writeContents(writePath, file, cb);
    });
  }

  var stream = through2.obj(saveFile);
  // TODO: option for either backpressure or lossy
  stream.resume();
  return stream;
}

module.exports = dest;
