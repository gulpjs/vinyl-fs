var streamFile = require('../src/streamFile');
var fs = require('graceful-fs');

module.exports = function(writePath, file, cb) {
  var outStream = fs.createWriteStream(writePath);

  file.contents.once('error', cb);
  file.contents.pipe(outStream).once('finish', function() {
    streamFile(file, cb);
  });

  return outStream;
};
