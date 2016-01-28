'use strict';

var mkdirp = require('mkdirp');

function writeDir(writePath, file, written) {
  mkdirp(writePath, file.stat.mode, written);
}

module.exports = writeDir;
