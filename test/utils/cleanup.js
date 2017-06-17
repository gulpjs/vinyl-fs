'use strict';

var rimraf = require('rimraf');
var expect = require('expect');

function cleanup(glob) {
  return function(cb) {
    this.timeout(20000);

    expect.restoreSpies();

    if (!glob) {
      return cb();
    }

    // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
    rimraf(glob, cb);
  };
}

module.exports = cleanup;
