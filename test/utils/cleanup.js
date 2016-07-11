'use strict';

var del = require('del');
var expect = require('expect');

function cleanup(globs) {
  return function() {
    this.timeout(20000);

    expect.restoreSpies();

    // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
    return del(globs);
  };
}

module.exports = cleanup;
