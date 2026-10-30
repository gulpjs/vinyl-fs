"use strict";

var rimraf = require("rimraf");

function cleanup(glob) {
  return function (t, done) {
    if (!glob) {
      return done();
    }

    rimraf(glob, done);
  };
}

module.exports = cleanup;
