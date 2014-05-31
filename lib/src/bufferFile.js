var fs = require('graceful-fs');
var stripBom = require('strip-bom');

module.exports = function (file, opt, cb) {
  fs.readFile(file.path, function (err, data) {
    if (data) {
      file.contents = (!opt || opt.stripBom) ? 
        stripBom(data) : data;
    }
    cb(err, file);
  });
};
