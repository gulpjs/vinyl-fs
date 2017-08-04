'use strict';

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');
var miss = require('mississippi');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var isWindows = require('./utils/is-windows');
var testConstants = require('./utils/test-constants');
var testStreams = require('./utils/test-streams');

var join = testStreams.join;

var from = miss.from;
var pipe = miss.pipe;

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

    var fchownSpy = expect.spyOn(fs, 'fchown').andCallThrough();

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
      stat: {
        uid: 1001,
        gid: 1001,
      },
    });

    function assert() {
      expect(fchownSpy.calls.length).toEqual(1);
      expect(fchownSpy.calls[0].arguments[1]).toEqual(1001);
      expect(fchownSpy.calls[0].arguments[2]).toEqual(1001);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase),
      join(assert),
    ], done);
  });

  it('does not call fchown when the uid and gid provided on the vinyl stat are invalid', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var fchownSpy = expect.spyOn(fs, 'fchown').andCallThrough();

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
      stat: {
        uid: -1,
        gid: -1,
      },
    });

    function assert() {
      expect(fchownSpy.calls.length).toEqual(0);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase),
      join(assert),
    ], done);
  });
});
