'use strict';

var through = require('through2');
var valueOrFunction = require('value-or-function');

var fo = require('../file-operations');

var number = valueOrFunction.number;

function makeDirs(opt) {

  function makeFileDirs(file, enc, callback) {
    // TODO: Can this be put on file.stat?
    var dirMode = number(opt.dirMode, file);

    fo.mkdirp(file.dirname, dirMode, onMkdirp);

    function onMkdirp(mkdirpErr) {
      if (mkdirpErr) {
        return callback(mkdirpErr);
      }
      callback(null, file);
    }
  }

  return through.obj(makeFileDirs);
}

module.exports = makeDirs;
