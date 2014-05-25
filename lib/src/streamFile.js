var fs = require('graceful-fs');
var stripBom = require('strip-bom');

module.exports = function (file, cb) {
  file.contents = fs.createReadStream(file.path)
    .pipe(stripBom.stream());
  cb(null, file);
};