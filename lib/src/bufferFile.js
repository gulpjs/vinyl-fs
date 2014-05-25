var fs = require('graceful-fs');
var stripBom = require('strip-bom');

module.exports = function (file, cb) {
  fs.readFile(file.path, function (err, data) {
    if (data) {
      file.contents = stripBom(data);
    }
    cb(err, file);
  });
};
