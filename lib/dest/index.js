var map = require('map-stream');
var path = require('path');
var mkdirp = require('mkdirp');

var writeContents = require('./writeContents');

module.exports = function(outFolder, opt) {
  if (!opt) opt = {};
  if (!opt.cwd) opt.cwd = process.cwd();

  var cwd = path.resolve(opt.cwd);

  function saveFile (file, cb) {
    var basePath = path.resolve(cwd, outFolder);
    var writePath = path.resolve(basePath, file.relative);
    var writeFolder = path.dirname(writePath);

    file.cwd = cwd;
    file.base = basePath;
    file.path = writePath;

    // mkdirp the folder the file is going in
    // then write to it
    mkdirp(writeFolder, function(err){
      if (err) return cb(err);
      writeContents(writePath, file, cb);
    });
  }
  var stream = map(saveFile);
  return stream;
};