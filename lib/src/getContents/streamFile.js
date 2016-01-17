'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom-stream');
var lazystream = require('lazystream');

function streamFile(file, opt, cb) {
  var filePath = file.path;

  var stat = file.stat;

  // The file.contents setter updates stat.mtime/ctime; reset it afterward.
  var mtime = stat.mtime;
  var ctime = stat.ctime;

  file.contents = new lazystream.Readable(function() {
    return fs.createReadStream(filePath);
  });

  if (opt.stripBOM) {
    file.contents = file.contents.pipe(stripBom());
  }

  stat.mtime = mtime;
  stat.ctime = ctime;

  cb(null, file);
}

module.exports = streamFile;
