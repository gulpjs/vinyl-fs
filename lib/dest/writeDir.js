var mkdirp = require('mkdirp');

module.exports = function (writePath, file, cb) {
  mkdirp(writePath, cb);
};