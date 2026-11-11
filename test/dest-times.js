"use strict";

var { afterEach, beforeEach, it } = require("node:test");

var fs = require("graceful-fs");
var File = require("vinyl");

var vfs = require("../");

var cleanup = require("./utils/cleanup");
var isWindows = require("./utils/is-windows");
var testConstants = require("./utils/test-constants");
var describeStreams = require("./utils/suite");

var skipWin = { skip: isWindows };

var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

describeStreams(".dest() with custom times", function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  beforeEach(clean);
  afterEach(clean);

  it("does not call futimes when no mtime is provided", skipWin, (t, done) => {
    // Changing the time of a directory errors in Windows.
    // Windows is treated as though it does not have permission to make this operation.
    var earlier = Date.now() - 1001;
    var futimesSpy = t.mock.method(fs, "futimes");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {},
    });

    function assert() {
      var stats = fs.lstatSync(outputPath);

      t.assert.strictEqual(futimesSpy.mock.callCount(), 0);
      t.assert.strictEqual(stats.atime.getTime() >= earlier, true);
      t.assert.strictEqual(stats.mtime.getTime() >= earlier, true);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("calls futimes when an mtime is provided", skipWin, (t, done) => {
    // Use new mtime
    var mtime = new Date(Date.now() - 2048);

    var futimesSpy = t.mock.method(fs, "futimes");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        mtime: mtime,
      },
    });

    function assert() {
      t.assert.strictEqual(futimesSpy.mock.callCount(), 1);

      // Compare args instead of fs.lstats(), since mtime may be drifted in x86 Node.js
      var mtimeSpy = futimesSpy.mock.calls[0].arguments[2];

      t.assert.strictEqual(mtimeSpy.getTime(), mtime.getTime());

      t.assert.strictEqual(file.stat.mtime, mtime);

      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("no futimes when provided mtime is invalid", skipWin, (t, done) => {
    var earlier = Date.now() - 1001;

    var futimesSpy = t.mock.method(fs, "futimes");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        mtime: new Date(undefined),
      },
    });

    function assert() {
      var stats = fs.lstatSync(outputPath);

      t.assert.strictEqual(futimesSpy.mock.callCount(), 0);
      t.assert.strictEqual(stats.mtime.getTime() >= earlier, true);

      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("calls futimes if mtime valid/atime invalid", skipWin, (t, done) => {
    // Use new mtime
    var mtime = new Date(Date.now() - 2048);
    var invalidAtime = new Date(undefined);

    var futimesSpy = t.mock.method(fs, "futimes");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        atime: invalidAtime,
        mtime: mtime,
      },
    });

    function assert() {
      t.assert.strictEqual(futimesSpy.mock.callCount(), 1);

      var mtimeSpy = futimesSpy.mock.calls[0].arguments[2];

      t.assert.strictEqual(mtimeSpy.getTime(), mtime.getTime());

      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("writes file atime and mtime using the vinyl stat", skipWin, (t, done) => {
    // Use new atime/mtime
    var atime = new Date(Date.now() - 2048);
    var mtime = new Date(Date.now() - 1024);

    var futimesSpy = t.mock.method(fs, "futimes");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        atime: atime,
        mtime: mtime,
      },
    });

    function assert() {
      t.assert.strictEqual(futimesSpy.mock.callCount(), 1);

      var atimeSpy = futimesSpy.mock.calls[0].arguments[1];
      var mtimeSpy = futimesSpy.mock.calls[0].arguments[2];

      t.assert.strictEqual(atimeSpy.getTime(), atime.getTime());
      t.assert.strictEqual(mtimeSpy.getTime(), mtime.getTime());
      t.assert.strictEqual(file.stat.mtime, mtime);
      t.assert.deepStrictEqual(file.stat.atime, atime);

      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });
});
