var fs = require('graceful-fs');

module.exports = function(writePath, file, cb) {
  var outStream = fs.createWriteStream(writePath);

  file.contents.once('error', cb);
  file.contents.pipe(outStream).once('finish', function() {
    file.contents = fs.createReadStream(writePath);
    cb();
  });

  return outStream;
};
