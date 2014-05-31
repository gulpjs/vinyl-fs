var fs = require('graceful-fs');
var stripBom = require('strip-bom');

module.exports = function (file, opt, cb) {
  file.contents = fs.createReadStream(file.path)
  if (!opt || opt.stripBom) {
    file.contents = file.contents.pipe(stripBom.stream())
  }
  cb(null, file);
};