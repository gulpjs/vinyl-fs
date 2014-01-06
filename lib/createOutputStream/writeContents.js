var writeDir = require('./writeDir');
var writeStream = require('./writeStream');
var writeBuffer = require('./writeBuffer');

module.exports = function (writePath, file, cb) {
  var done =  function(err){
    if (err) return cb(err);
    cb(null, file);
  };

  // if no contents then do nothing
  if (file.isNull()) return done();

  // if directory then mkdirp it
  // probably redundant since we are already doing an mkdirp
  if (file.isDirectory()) {
    writeDir(writePath, file, done);
    return;
  }

  // stream it to disk yo
  if (file.isStream()) {
    writeStream(writePath, file, done);
    return;
  }

  if (file.isBuffer()) {
    // write it like normal
    writeBuffer(writePath, file, done);
    return;
  }
};