"use strict";

var rimraf = require("rimraf");

function cleanup(glob) {
  return function (t, done) {
    if (!glob) {
      return done();
    }

    // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
    rimraf(glob, done);
  };
}

module.exports = cleanup;
