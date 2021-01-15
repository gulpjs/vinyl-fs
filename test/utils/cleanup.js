'use strict';

var rimraf = require('rimraf');
var sinon = require('sinon');

function cleanup(glob) {
  return function(cb) {
    this.timeout(20000);

    sinon.restore();

    if (!glob) {
      return cb();
    }

    // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
    rimraf(glob, cb);
  };
}

module.exports = cleanup;
