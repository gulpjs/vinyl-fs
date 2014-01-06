var fs = require('fs');

module.exports = function(writePath, file, cb) {
  fs.writeFile(writePath, file.contents, cb);
};