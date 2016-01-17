'use strict';

var fs = require('graceful-fs');
var stripBom = require('strip-bom');

function bufferFile(file, opt, cb) {
  fs.readFile(file.path, function(err, data) {
    if (err) {
      return cb(err);
    }

    var stat = file.stat;

    // The file.contents setter updates stat.mtime/ctime; reset it afterward.
    var mtime = stat.mtime;
    var ctime = stat.ctime;

    if (opt.stripBOM) {
      file.contents = stripBom(data);
    } else {
      file.contents = data;
    }

    stat.mtime = mtime;
    stat.ctime = ctime;

    cb(null, file);
  });
}

module.exports = bufferFile;
