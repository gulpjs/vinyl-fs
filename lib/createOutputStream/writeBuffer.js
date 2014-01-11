var fs = require('graceful-fs');

module.exports = function(writePath, file, cb) {
  fs.writeFile(writePath, file.contents, cb);
};