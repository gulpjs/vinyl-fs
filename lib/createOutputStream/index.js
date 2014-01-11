var map = require('map-stream');
var path = require('path');
var mkdirp = require('mkdirp');
var writeFile = require('./writeContents');
var writeDir = require('./writeDir');

module.exports = function(folder, opt) {
  if (!opt) opt = {};
  // TODO: support opt.cwd

  folder = path.resolve(folder);

  // TODO: clean this crap up
  // createOutputStream should be a mirror of createInputStream file-wise
  function saveFile (file, cb) {
    var writePath = path.join(folder, file.relative);
    var writeFolder = path.dirname(writePath);

    mkdirp(writeFolder, function(err){
      if (err) return cb(err);
      writeFile(writePath, file, cb);
    });
  }
  var stream = map(saveFile);
  return stream;
};
