"use strict";

var path = require("node:path");
var { afterEach, beforeEach, it } = require("node:test");

var fs = require("graceful-fs");

var vfs = require("../");

var cleanup = require("./utils/cleanup");
var isWindows = require("./utils/is-windows");
var testStreams = require("./utils/test-streams");
var testConstants = require("./utils/test-constants");
var describeStreams = require("./utils/suite");

var skipPosix = { skip: !isWindows };
var skipWin = { skip: isWindows };

var base = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var symlinkDirpath = testConstants.symlinkDirpath;
var inputBase = path.join(base, "./in/");
var inputGlob = path.join(inputBase, "./*.txt");
var outputBase = path.join(base, "./out/");
var outputPath = path.join(outputBase, "./test.txt");
var outputSymlink = path.join(symlinkDirpath, "./foo");
var outputDirpathSymlink = path.join(outputDirpath, "./foo");
var content = testConstants.contents;

var clean = cleanup(base);

describeStreams("integrations", function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var count = streamUtils.count;
  var concatArray = streamUtils.concatArray;

  beforeEach(clean);
  afterEach(clean);

  // This can be a very slow test on boxes with slow disk i/o
  it("does not exhaust available file descriptors when streaming thousands of files", (t, done) => {
    // Make a ton of files. Changed from hard links due to Windows failures
    var expectedCount = 6000;

    fs.mkdirSync(base);
    fs.mkdirSync(inputBase);

    for (var idx = 0; idx < expectedCount; idx++) {
      var filepath = path.join(inputBase, "./test" + idx + ".txt");
      fs.writeFileSync(filepath, content);
    }

    pipeline(
      [
        vfs.src(inputGlob, { buffer: false }),
        count(expectedCount),
        vfs.dest(outputBase),
      ],
      done,
    );
  });

  it("(*nix) sources a dirs, creates a symlink and cp", skipWin, (t, done) => {
    function assert(files) {
      var symlinkResult = fs.readlinkSync(outputSymlink);
      var destResult = fs.readlinkSync(outputDirpathSymlink);

      t.assert.strictEqual(symlinkResult, inputDirpath);
      t.assert.strictEqual(destResult, inputDirpath);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(files[0].symlink, inputDirpath);
    }

    pipeline(
      [
        vfs.src(inputDirpath),
        vfs.symlink(symlinkDirpath),
        vfs.dest(outputDirpath),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(win) sources a dir, creates & copy a junction", skipPosix, (t, done) => {
    function assert(files) {
      // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
      var expected = inputDirpath;
      var symlinkResult = fs.readlinkSync(outputSymlink);
      var destResult = fs.readlinkSync(outputDirpathSymlink);

      t.assert.strictEqual(symlinkResult, expected);
      t.assert.strictEqual(destResult, expected);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(files[0].symlink, inputDirpath);
    }

    pipeline(
      [
        vfs.src(inputDirpath),
        vfs.symlink(symlinkDirpath),
        vfs.dest(outputDirpath),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(*nix) sources a symlink and copies it", skipWin, (t, done) => {
    fs.mkdirSync(base);
    fs.mkdirSync(symlinkDirpath);
    fs.symlinkSync(inputDirpath, outputSymlink);

    function assert(files) {
      var destResult = fs.readlinkSync(outputDirpathSymlink);

      t.assert.strictEqual(destResult, inputDirpath);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(files[0].symlink, inputDirpath);
    }

    pipeline(
      [
        vfs.src(outputSymlink, { resolveSymlinks: false }),
        vfs.dest(outputDirpath),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(win) sources a dir symlink and copies it", skipPosix, (t, done) => {
    fs.mkdirSync(base);
    fs.mkdirSync(symlinkDirpath);
    fs.symlinkSync(inputDirpath, outputSymlink, "dir");

    function assert(files) {
      // When creating `dir` symlinks, it seems Windows no longer appends a separator as of Node 22+
      var expected = inputDirpath;
      var destResult = fs.readlinkSync(outputDirpathSymlink);

      t.assert.strictEqual(destResult, expected);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(files[0].symlink, inputDirpath);
    }

    pipeline(
      [
        vfs.src(outputSymlink, { resolveSymlinks: false }),
        vfs.dest(outputDirpath),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(win) sources a junction and copies it", skipPosix, (t, done) => {
    fs.mkdirSync(base);
    fs.mkdirSync(symlinkDirpath);
    fs.symlinkSync(inputDirpath, outputSymlink, "junction");

    function assert(files) {
      // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
      var expected = inputDirpath;
      var destResult = fs.readlinkSync(outputDirpathSymlink);

      t.assert.strictEqual(destResult, expected);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(files[0].symlink, inputDirpath);
    }

    pipeline(
      [
        vfs.src(outputSymlink, { resolveSymlinks: false }),
        vfs.dest(outputDirpath),
        concatArray(assert),
      ],
      done,
    );
  });

  it("can re-assign contents to a well-behaving stream as per issue #310", (t, done) => {
    var contents = ["something", " ", "else"];

    function assert() {
      t.assert.strictEqual(
        fs.readFileSync(outputPath).toString(),
        contents.join(""),
      );
      done();
    }

    pipeline(
      [
        vfs.src(inputPath),
        new stream.Transform({
          objectMode: true,
          transform: function (file, enc, cb) {
            if (typeof enc === "function") {
              cb = enc;
            }

            file.contents = from(contents);
            cb(null, file);
          },
        }),
        vfs.dest(outputBase),
      ],
      assert,
    );
  });
});
