var fs = require('fs');

module.exports = function(file, cb) {
  fs.writeFile(writePath, file.contents, cb);
};