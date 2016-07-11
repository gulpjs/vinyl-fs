'use strict';

var fs = require('graceful-fs');

var constants = require('../../lib/constants');

function masked(mode) {
  return mode & constants.MASK_MODE;
}

function statMode(outputPath) {
  return masked(fs.lstatSync(outputPath).mode);
}

module.exports = statMode;
