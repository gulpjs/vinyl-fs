"use strict";

var { afterEach, beforeEach, it } = require("node:test");

var fs = require("graceful-fs");
var File = require("vinyl");

var vfs = require("../");

var cleanup = require("./utils/cleanup");
var statMode = require("./utils/stat-mode");
var mockError = require("./utils/mock-error");
var isWindows = require("./utils/is-windows");
var applyUmask = require("./utils/apply-umask");
var always = require("./utils/always");
var testConstants = require("./utils/test-constants");
var describeStreams = require("./utils/suite");

var skipWin = { skip: isWindows };

var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var inputNestedPath = testConstants.inputNestedPath;
var outputNestedPath = testConstants.outputNestedPath;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

describeStreams(".dest() with custom modes", (stream) => {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  beforeEach(clean);
  afterEach(clean);

  it("applies vinyl mode to written buffer files", skipWin, (t, done) => {
    // Changing the mode of a file is not supported by node.js in Windows.
    // Windows is treated as though it does not have permission to make this operation.

    var expectedMode = applyUmask("677");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        mode: expectedMode,
      },
    });

    function assert() {
      t.assert.strictEqual(statMode(outputPath), expectedMode);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("applies vinyl sticky bit to written stream files", skipWin, (t, done) => {
    var expectedMode = applyUmask("1677");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
      stat: {
        mode: expectedMode,
      },
    });

    function assert() {
      t.assert.strictEqual(statMode(outputPath), expectedMode);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("applies vinyl mode to stream files", skipWin, (t, done) => {
    var expectedMode = applyUmask("677");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
      stat: {
        mode: expectedMode,
      },
    });

    function assert() {
      t.assert.strictEqual(statMode(outputPath), expectedMode);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("applies vinyl mode to written directories", skipWin, (t, done) => {
    var expectedMode = applyUmask("677");

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
        mode: expectedMode,
      },
    });

    function assert() {
      t.assert.strictEqual(statMode(outputDirpath), expectedMode);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("applies vinyl sticky bit to directories", skipWin, (t, done) => {
    var expectedMode = applyUmask("1677");

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
        mode: expectedMode,
      },
    });

    function assert() {
      t.assert.strictEqual(statMode(outputDirpath), expectedMode);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("writes new files with the mode in options", skipWin, (t, done) => {
    var expectedMode = applyUmask("777");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert() {
      t.assert.strictEqual(statMode(outputPath), expectedMode);
      done();
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { cwd: __dirname, mode: expectedMode }),
      ],
      assert,
    );
  });

  it("updates the file mode to match vinyl mode", skipWin, (t, done) => {
    var startMode = applyUmask("655");
    var expectedMode = applyUmask("722");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        mode: expectedMode,
      },
    });

    function assert() {
      t.assert.strictEqual(statMode(outputPath), expectedMode);
      done();
    }

    fs.mkdirSync(outputBase);
    fs.closeSync(fs.openSync(outputPath, "w"));
    fs.chmodSync(outputPath, startMode);

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("updates the directory mode to match the vinyl", skipWin, (t, done) => {
    var startMode = applyUmask("2777");
    var expectedMode = applyUmask("727");

    var file1 = new File({
      base: inputBase,
      path: outputDirpath,
      stat: {
        isDirectory: always(true),
        mode: startMode,
      },
    });
    var file2 = new File({
      base: inputBase,
      path: outputDirpath,
      stat: {
        isDirectory: always(true),
        mode: expectedMode,
      },
    });

    function assert() {
      t.assert.strictEqual(statMode(outputDirpath), expectedMode);
      done();
    }

    pipeline(
      [from([file1, file2]), vfs.dest(outputBase, { cwd: __dirname })],
      assert,
    );
  });

  it("uses different modes for files and directories", skipWin, (t, done) => {
    var expectedDirMode = applyUmask("2777");
    var expectedFileMode = applyUmask("755");

    var file = new File({
      base: inputBase,
      path: inputNestedPath,
      contents: Buffer.from(contents),
    });

    function assert() {
      t.assert.strictEqual(statMode(outputDirpath), expectedDirMode);
      t.assert.strictEqual(statMode(outputNestedPath), expectedFileMode);
      done();
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, {
          cwd: __dirname,
          mode: expectedFileMode,
          dirMode: expectedDirMode,
        }),
      ],
      assert,
    );
  });

  it("does not fchmod a matching file", skipWin, (t, done) => {
    var fchmodSpy = t.mock.method(fs, "fchmod");

    var expectedMode = applyUmask("777");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        mode: expectedMode,
      },
    });

    function assert() {
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 0);
      t.assert.strictEqual(statMode(outputPath), expectedMode);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("sees a file with special chmod as distinct", skipWin, (t, done) => {
    var fchmodSpy = t.mock.method(fs, "fchmod");

    var startMode = applyUmask("3722");
    var expectedMode = applyUmask("722");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        mode: expectedMode,
      },
    });

    function assert() {
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 1);
      done();
    }

    fs.mkdirSync(outputBase);
    fs.closeSync(fs.openSync(outputPath, "w"));
    fs.chmodSync(outputPath, startMode);

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });

  it("reports fchmod errors", skipWin, (t, done) => {
    var expectedMode = applyUmask("722");

    var fchmodSpy = t.mock.method(fs, "fchmod", mockError);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        mode: expectedMode,
      },
    });

    function assert(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 1);
      done();
    }

    fs.mkdirSync(outputBase);
    fs.closeSync(fs.openSync(outputPath, "w"));

    pipeline([from([file]), vfs.dest(outputBase, { cwd: __dirname })], assert);
  });
});
