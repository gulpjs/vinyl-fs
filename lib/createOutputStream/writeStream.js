module.exports = function(writePath, file, cb) {
  var outStream = fs.createWriteStream(writePath);
  file.contents.once('error', cb);
  file.contents.once('end', function(){
    cb();
  });
  file.contents.pipe(outStream);
};