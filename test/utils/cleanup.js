'use strict';

var rimraf = require('rimraf');

function cleanup(glob) {
  return function (cb) {
    this.timeout(0);

    if (!process.versions.node.startsWith("10.") && !process.versions.node.startsWith("12.")) {
      var sinon = require('sinon');

      sinon.restore();
    }

    if (!glob) {
      return cb();
    }

    // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
    rimraf(glob, cb);
  };
}

module.exports = cleanup;
