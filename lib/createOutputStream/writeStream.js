module.exports = function(writePath, file, cb) {
  var outStream = fs.createWriteStream(writePath);
  file.contents.once('error', cb);
  file.contents.once('end', function(){
    cb(null);
  });
  file.contents.pipe(outStream);
  file.contents.resume();
};