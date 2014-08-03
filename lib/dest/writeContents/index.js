'use strict';

var fs = require('fs');
var writeDir = require('./writeDir');
var writeStream = require('./writeStream');
var writeBuffer = require('./writeBuffer');

function writeContents(writePath, file, cb) {
  var written = function(err){
    var done = function(err) {
      cb(err, file);
    };
    if (!err) {
      if (file.stat && typeof file.stat.mode === 'number') {
        fs.stat(writePath, function(err, st) {
          if (err) {
            done(err);
            return;
          }
          // octal 7777 = decimal 4095
          if ((st.mode & 4095) !== file.stat.mode) {
            fs.chmod(writePath, file.stat.mode, done);
          } else {
            done(null);
          }
        });
        return;
      }
      return;
    }
    done(err);
  };

  // if directory then mkdirp it
  if (file.isDirectory()) {
    writeDir(writePath, file, written);
    return;
  }

  // stream it to disk yo
  if (file.isStream()) {
    writeStream(writePath, file, written);
    return;
  }

  // write it like normal
  if (file.isBuffer()) {
    writeBuffer(writePath, file, written);
    return;
  }

  // if no contents then do nothing
  if (file.isNull()) {
    cb(null, file);
    return;
  }
}

module.exports = writeContents;
