'use strict';

var through = require('through2');
var valueOrFunction = require('value-or-function');

var fo = require('../file-operations');
var writeContents = require('./write-contents');

var number = valueOrFunction.number;

function saveFileStream(opt) {

  function saveFile(file, enc, callback) {
    // TODO: Can this be put on file.stat?
    var dirMode = number(opt.dirMode, file);

    fo.mkdirp(file.dirname, dirMode, onMkdirp);

    function onMkdirp(mkdirpErr) {
      if (mkdirpErr) {
        return callback(mkdirpErr);
      }
      writeContents(file, callback);
    }
  }

  return through.obj(saveFile);
}

module.exports = saveFileStream;
