'use strict';

var path = require('path');

var fs = require('graceful-fs');
var miss = require('mississippi');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var testStreams = require('./utils/test-streams');
var testConstants = require('./utils/test-constants');

var pipe = miss.pipe;

var count = testStreams.count;

var base = testConstants.outputBase;
var inputBase = path.join(base, './in/');
var inputGlob = path.join(inputBase, './*.txt');
var outputBase = path.join(base, './out/');
var content = testConstants.content;

var clean = cleanup(base);

describe('integrations', function() {

  beforeEach(clean);
  afterEach(clean);

  it('does not exhaust available file descriptors when streaming thousands of files', function(done) {
    // This can be a very slow test on boxes with slow disk i/o
    this.timeout(0);
    this.slow(60000);

    // Make a ton of files. Changed from hard links due to Windows failures
    var expectedCount = 6000;

    fs.mkdirSync(base);
    fs.mkdirSync(inputBase);

    for (var idx = 0; idx < expectedCount; idx++) {
      var filepath = path.join(inputBase, './test' + idx + '.txt');
      fs.writeFileSync(filepath, content);
    }

    pipe([
      vfs.src(inputGlob, { buffer: false }),
      count(expectedCount),
      vfs.dest(outputBase),
    ], done);
  });
});
