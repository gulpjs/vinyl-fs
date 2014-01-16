var mkdirp = require('mkdirp');

module.exports = function (writePath, file, cb) {
  mkdirp(writePath, function (err) {
    cb(err, file);
  });
};