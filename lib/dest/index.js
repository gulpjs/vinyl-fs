var async = require('async');
var map = require('map-stream');
var path = require('path');
var mkdirp = require('mkdirp');

var writeContents = require('./writeContents');

module.exports = function(outFolder, opt) {
  if (!opt) opt = {};
  if (!opt.cwd) opt.cwd = process.cwd();

  function saveFile (file, cb) {
    var writePath = path.resolve(opt.cwd, outFolder, file.relative);
    var writeFolder = path.dirname(writePath);

    // mkdirp the folder the file is going in
    // then write to it
    mkdirp(writeFolder, function(err){
      writeContents(writePath, file, cb);
    });
  }
  var stream = map(saveFile);
  return stream;
};