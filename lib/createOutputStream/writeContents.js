var fs = require('fs');

module.exports = function (writePath, file, cb) {
  // if no contents then do nothing
  if (file.isNull()) return cb(null, file);

  // if directory then mkdirp it
  // probably redundant since we are already doing an mkdirp
  if (file.isDirectory()) {
    writeDir(writePath, file, function(err){
      if (err) return cb(err);
      cb(null, file);
    });
    return;
  }

  // stream it to disk yo
  if (file.isStream()) {
    var outStream = fs.createWriteStream(writePath);
    file.contents.once('end', function(){
      cb(null, file);
    });
    file.contents.pipe(outStream);
    file.contents.resume();
    return;
  }

  if (file.isBuffer()) {
    // write it like normal
    fs.writeFile(writePath, file.contents, function(err){
      if (err) return cb(err);
      cb(null, file);
    });
    return;
  }
};