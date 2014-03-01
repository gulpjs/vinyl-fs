var fs = require('graceful-fs');

module.exports = function(writePath, file, cb) {
  var opt = {};

  if (file.stat && typeof file.stat.mode !== 'undefined') {
    opt.mode = file.stat.mode;
  }

  var outStream = fs.createWriteStream(writePath, opt);
  file.contents.once('error', cb);
  outStream.once('finish', cb);

  file.contents.pipe(outStream);
  return outStream;
};
