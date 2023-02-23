'use strict';

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');
var sinon = require('sinon');
var stream = require('stream');
var concat = require('concat-stream');

// TODO: This `from` should be replaced to `node:stream.Readable.from`
// if this package supports only >= v10.17.0
var from = require('streamx').Readable.from;

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var isWindows = require('./utils/is-windows');
var testConstants = require('./utils/test-constants');

var pipeline = stream.pipeline;

var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

describe('.dest() with custom owner', function() {

  beforeEach(clean);
  afterEach(clean);

  it('calls fchown when the uid and/or gid are provided on the vinyl stat', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var fchownSpy = sinon.spy(fs, 'fchown');

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        uid: 1001,
        gid: 1001,
      },
    });

    function assert() {
      expect(fchownSpy.callCount).toEqual(1);
      expect(fchownSpy.getCall(0).args[1]).toEqual(1001);
      expect(fchownSpy.getCall(0).args[2]).toEqual(1001);
    }

    pipeline([
      from([file]),
      vfs.dest(outputBase),
      concat(assert),
    ], done);
  });

  it('does not call fchown when the uid and gid provided on the vinyl stat are invalid', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var fchownSpy = sinon.spy(fs, 'fchown');

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        uid: -1,
        gid: -1,
      },
    });

    function assert() {
      expect(fchownSpy.callCount).toEqual(0);
    }

    pipeline([
      from([file]),
      vfs.dest(outputBase),
      concat(assert),
    ], done);
  });
});
