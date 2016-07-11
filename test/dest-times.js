'use strict';

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');
var miss = require('mississippi');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var isWindows = require('./utils/is-windows');
var testConstants = require('./utils/test-constants');

var from = miss.from;
var pipe = miss.pipe;
var concat = miss.concat;

var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var contents = testConstants.contents;

var clean = cleanup([outputBase]);

describe('.dest() with custom times', function() {

  beforeEach(clean);
  afterEach(clean);

  it('does not call futimes when no mtime is provided on the vinyl stat', function(done) {
    // Changing the time of a directory errors in Windows.
    // Windows is treated as though it does not have permission to make this operation.
    if (isWindows) {
      this.skip();
      return;
    }

    var earlier = Date.now() - 1001;

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
      stat: {},
    });

    function assert() {
      var stats = fs.lstatSync(outputPath);

      expect(futimesSpy.calls.length).toEqual(0);
      expect(stats.atime.getTime()).toBeGreaterThan(earlier);
      expect(stats.mtime.getTime()).toBeGreaterThan(earlier);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { cwd: __dirname }),
      concat(assert),
    ], done);
  });

  it('calls futimes when an mtime is provided on the vinyl stat', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    // Use the mtime of this file to have proper resolution
    var mtime = fs.statSync(__filename).mtime;

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
      stat: {
        mtime: mtime,
      },
    });

    function assert() {
      var stats = fs.lstatSync(outputPath);

      expect(futimesSpy.calls.length).toEqual(1);
      expect(stats.mtime.getTime()).toEqual(mtime.getTime());
      expect(file.stat.mtime).toEqual(mtime);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { cwd: __dirname }),
      concat(assert),
    ], done);
  });

  it('does not call futimes when provided mtime on the vinyl stat is invalid', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var earlier = Date.now() - 1001;

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
      stat: {
        mtime: new Date(undefined),
      },
    });

    function assert() {
      var stats = fs.lstatSync(outputPath);

      expect(futimesSpy.calls.length).toEqual(0);
      expect(stats.mtime.getTime()).toBeGreaterThan(earlier);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { cwd: __dirname }),
      concat(assert),
    ], done);
  });

  it('calls futimes when provided mtime on the vinyl stat is valid but provided atime is invalid', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    // Use the mtime of this file to have proper resolution
    var mtime = fs.lstatSync(__filename).mtime;
    var invalidAtime = new Date(undefined);

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
      stat: {
        atime: invalidAtime,
        mtime: mtime,
      },
    });

    function assert() {
      var stats = fs.lstatSync(outputPath);

      expect(futimesSpy.calls.length).toEqual(1);
      expect(stats.mtime.getTime()).toEqual(mtime.getTime());
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { cwd: __dirname }),
      concat(assert),
    ], done);
  });

  it('writes file atime and mtime using the vinyl stat', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    // Use the atime/mtime of this file to have proper resolution
    var atime = fs.lstatSync(__filename).atime;
    var mtime = fs.lstatSync(__filename).mtime;

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
      stat: {
        atime: atime,
        mtime: mtime,
      },
    });

    function assert() {
      var stats = fs.lstatSync(outputPath);

      expect(stats.atime.getTime()).toEqual(atime.getTime());
      expect(stats.mtime.getTime()).toEqual(mtime.getTime());
      expect(file.stat.mtime).toEqual(mtime);
      expect(file.stat.atime).toEqual(atime);
    };

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { cwd: __dirname }),
      concat(assert),
    ], done);
  });
});
