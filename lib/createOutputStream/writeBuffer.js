var fs = require('graceful-fs');

module.exports = function(file, cb) {
  fs.writeFile(writePath, file.contents, cb);
};