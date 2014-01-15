var map = require('map-stream');
var path = require('path');
var mkdirp = require('mkdirp');
var writeContents = require('./writeContents');

module.exports = function(folder, opt) {
  if (!opt) opt = {};
  if (!opt.cwd) opt.cwd = process.cwd();

  function saveFile (file, cb) {
    var writePath = path.resolve(opt.cwd, folder, file.relative);
    var writeFolder = path.dirname(writePath);

    mkdirp(writeFolder, function(err){
      if (err) return cb(err);
      writeContents(writePath, file, cb);
    });
  }
  var stream = map(saveFile);
  return stream;
};
