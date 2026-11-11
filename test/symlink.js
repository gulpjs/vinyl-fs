"use strict";

var path = require("node:path");
var { afterEach, beforeEach, it } = require("node:test");

var fs = require("graceful-fs");
var File = require("vinyl");

var vfs = require("../");

var cleanup = require("./utils/cleanup");
var isWindows = require("./utils/is-windows");
var testStreams = require("./utils/test-streams");
var always = require("./utils/always");
var testConstants = require("./utils/test-constants");
var breakPrototype = require("./utils/break-prototype");
var describeStreams = require("./utils/suite");

function noop() {}

var skipPosix = { skip: !isWindows };
var skipWin = { skip: isWindows };

var outputRelative = testConstants.outputRelative;
var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

describeStreams("symlink stream", function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var count = streamUtils.count;
  var slowCount = streamUtils.slowCount;
  var concatArray = streamUtils.concatArray;

  beforeEach(clean);
  afterEach(clean);

  it("throws on no folder argument", function (t) {
    function noFolder() {
      vfs.symlink();
    }

    t.assert.throws(noFolder, {
      message:
        "Invalid symlink() folder argument. Please specify a non-empty string or a function.",
    });
  });

  it("throws on empty string folder argument", function (t) {
    function emptyFolder() {
      vfs.symlink("");
    }

    t.assert.throws(emptyFolder, {
      message:
        "Invalid symlink() folder argument. Please specify a non-empty string or a function.",
    });
  });

  it("passes through writes with cwd", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].cwd, __dirname);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputRelative, { cwd: __dirname }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("passes through writes with default cwd", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].cwd, process.cwd());
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done,
    );
  });

  it("creates a link to the right folder with relative cwd", (t, done) => {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(outputLink, inputPath);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputRelative, { cwd: cwd }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("creates a link to the right folder with function and relative cwd", (t, done) => {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function outputFn(f) {
      t.assert.strictEqual(f, file);
      return outputRelative;
    }

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(outputLink, inputPath);
    }

    pipeline(
      [from([file]), vfs.symlink(outputFn, { cwd: cwd }), concatArray(assert)],
      done,
    );
  });

  it("creates a link for a file with buffered contents", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(outputLink, inputPath);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done,
    );
  });

  it("can create relative links", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(outputLink, path.normalize("../fixtures/test.txt"));
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { relativeSymlinks: true }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("will create symlinks with different names if property set in pipeline", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    var renamed = "renamed-symlink.txt";

    function assert(files) {
      var outputLink = fs.readlinkSync(path.join(outputBase, renamed));

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, path.join(outputBase, renamed));
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(outputLink, inputPath);
    }

    pipeline(
      [
        from([file]),
        new stream.Transform({
          objectMode: true,
          transform: function (file, enc, cb) {
            if (typeof enc === "function") {
              cb = enc;
            }

            // User can stash the file.path on the symlink before they rename the file
            file.symlink = file.path;
            // Then they can rename the file
            file.basename = renamed;
            cb(null, file);
          },
        }),
        vfs.symlink(outputBase),
        concatArray(assert),
      ],
      done,
    );
  });

  it("creates a link for a file with streaming contents", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(outputLink, inputPath);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done,
    );
  });

  it("emits Vinyl objects that are symbolic", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isSymbolic(), true);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done,
    );
  });

  it("(*nix) creates a link for a directory", skipWin, (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputDirpath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(outputLink, inputDirpath);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done,
    );
  });

  it("(windows) creates a junction for a directory", skipPosix, (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputDirpath);
      // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done,
    );
  });

  it("(windows) disables directory junctions", skipPosix, (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputDirpath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(outputLink, inputDirpath);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { useJunctions: false }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(windows) disables junctions via function", skipPosix, (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function useJunctions(f) {
      t.assert.strictEqual(f, file);
      return false;
    }

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputDirpath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(outputLink, inputDirpath);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { useJunctions: useJunctions }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(*nix) can create relative links for dirs", skipWin, (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputDirpath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(outputLink, path.normalize("../fixtures/foo"));
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { relativeSymlinks: true }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(win) ignores relativeSymlinks for junctions", skipPosix, (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputDirpath);
      // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, {
          useJunctions: true,
          relativeSymlinks: true,
        }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(win) support relativeSymlinks on non-dirs", skipPosix, (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(outputLink, path.normalize("../fixtures/test.txt"));
    }

    pipeline(
      [
        from([file]),
        // The useJunctions option is ignored when file is not a directory
        vfs.symlink(outputBase, {
          useJunctions: true,
          relativeSymlinks: true,
        }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(win) rl for dirs without junctions", skipPosix, (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputDirpath);
      t.assert.strictEqual(files[0].symlink, outputLink);
      t.assert.strictEqual(outputLink, path.normalize("../fixtures/foo"));
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, {
          useJunctions: false,
          relativeSymlinks: true,
        }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("reports IO errors", skipWin, (t, done) => {
    // Changing the mode of a file is not supported by node.js in Windows.
    // This test is skipped on Windows because we have to chmod the file to 0.
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    fs.mkdirSync(outputBase);
    fs.chmodSync(outputBase, 0);

    function assert(err) {
      t.assert.strictEqual(err.code, "EACCES");
      done();
    }

    pipeline([from([file]), vfs.symlink(outputDirpath)], assert);
  });

  it("does not overwrite links with overwrite option set to false", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputContents, existingContents);
    }

    // Write expected file which should not be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { overwrite: false }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("overwrites links with overwrite option set to true", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputContents, contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { overwrite: true }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not overwrite links with overwrite option set to a function that returns false", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function overwrite(f) {
      t.assert.strictEqual(f, file);
      return false;
    }

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputContents, existingContents);
    }

    // Write expected file which should not be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { overwrite: overwrite }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("overwrites links with overwrite option set to a function that returns true", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function overwrite(f) {
      t.assert.strictEqual(f, file);
      return true;
    }

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputContents, contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { overwrite: overwrite }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("emits an end event", (t, done) => {
    var symlinkStream = vfs.symlink(outputBase);

    var ended = false;
    function assert(err) {
      t.assert.strictEqual(ended, true);
      done(err);
    }

    symlinkStream.on("end", function () {
      ended = true;
    });

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    pipeline([from([file]), symlinkStream], assert);
  });

  it("emits a finish event", (t, done) => {
    var symlinkStream = vfs.symlink(outputBase);

    var finished = false;
    symlinkStream.on("finish", function () {
      finished = true;
    });

    function assert(err) {
      t.assert.ok(finished);
      done(err);
    }

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    pipeline([from([file]), symlinkStream], assert);
  });

  it("errors when a non-Vinyl object is emitted", (t, done) => {
    var file = {};

    function assert(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(
        err.message,
        "Received a non-Vinyl object in `symlink()`",
      );
      done();
    }

    pipeline([from([file]), vfs.symlink(outputBase)], assert);
  });

  it("errors when a buffer-mode stream is piped to it", (t, done) => {
    var file = Buffer.from("test");

    function assert(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(
        err.message,
        "Received a non-Vinyl object in `symlink()`",
      );
      done();
    }

    pipeline([from([file]), vfs.symlink(outputBase)], assert);
  });

  it("does not get clogged by highWaterMark", (t, done) => {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: null,
      });
      highwatermarkFiles.push(file);
    }

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concatArray stream cannot be used
        vfs.symlink(outputBase),
      ],
      done,
    );
  });

  it("allows backpressure when piped to another, slower stream", (t, done) => {
    var expectedCount = 24;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: null,
      });
      highwatermarkFiles.push(file);
    }

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        vfs.symlink(outputBase),
        slowCount(expectedCount),
      ],
      done,
    );
  });

  it("respects readable listeners on symlink stream", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var symlinkStream = vfs.symlink(outputBase);

    var readables = 0;
    symlinkStream.on("readable", function () {
      var data = symlinkStream.read();

      if (data != null) {
        readables++;
      }
    });

    function assert(err) {
      t.assert.strictEqual(readables, 1);
      done(err);
    }

    pipeline([from([file]), symlinkStream], assert);
  });

  it("respects data listeners on symlink stream", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var symlinkStream = vfs.symlink(outputBase);

    var datas = 0;
    symlinkStream.on("data", function () {
      datas++;
    });

    function assert(err) {
      t.assert.strictEqual(datas, 1);
      done(err);
    }

    pipeline([from([file]), symlinkStream], assert);
  });

  it("sinks the stream if all the readable event handlers are removed", (t, done) => {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: null,
      });
      highwatermarkFiles.push(file);
    }

    var symlinkStream = vfs.symlink(outputBase);

    symlinkStream.on("readable", noop);

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concatArray stream cannot be used
        symlinkStream,
      ],
      done,
    );

    process.nextTick(function () {
      symlinkStream.removeListener("readable", noop);
    });
  });

  it("sinks the stream if all the data event handlers are removed", (t, done) => {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: null,
      });
      highwatermarkFiles.push(file);
    }

    var symlinkStream = vfs.symlink(outputBase);

    symlinkStream.on("data", noop);

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concatArray stream cannot be used
        symlinkStream,
      ],
      done,
    );

    process.nextTick(function () {
      symlinkStream.removeListener("data", noop);
    });
  });

  it("does not pass options on to stream", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    // Reference: https://github.com/gulpjs/vinyl-fs/issues/153
    var read = t.mock.fn(() => false);

    function assert() {
      // Called never because it's not a valid option
      t.assert.strictEqual(read.mock.callCount(), 0);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { read: read }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not marshall a Vinyl object with isSymbolic method", (t, done) => {
    var file = new File({
      base: outputBase,
      path: outputPath,
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      // Avoid comparing stats because they get reflected
      t.assert.strictEqual(files[0], file);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done,
    );
  });

  it("marshalls a Vinyl object without isSymbolic to a newer Vinyl", (t, done) => {
    var file = new File({
      base: outputBase,
      path: outputPath,
      // Pre-set this because it is set by symlink
      symlink: outputPath,
    });

    breakPrototype(file);

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      // Avoid comparing stats because they get reflected
      files[0].stat = file.stat;
      t.assert.partialDeepStrictEqual(files[0], file);
      t.assert.notStrictEqual(files[0], file);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done,
    );
  });
});
