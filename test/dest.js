"use strict";

var path = require("node:path");
var { afterEach, beforeEach, it } = require("node:test");

var fs = require("graceful-fs");
var File = require("vinyl");

var vfs = require("../");

var cleanup = require("./utils/cleanup");
var statMode = require("./utils/stat-mode");
var mockError = require("./utils/mock-error");
var applyUmask = require("./utils/apply-umask");
var testStreams = require("./utils/test-streams");
var always = require("./utils/always");
var testConstants = require("./utils/test-constants");
var breakPrototype = require("./utils/break-prototype");
var describeStreams = require("./utils/suite");

function noop() {}

var inputRelative = testConstants.inputRelative;
var outputRelative = testConstants.outputRelative;
var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var outputRenamePath = testConstants.outputRenamePath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var encodedInputPath = testConstants.encodedInputPath;
var ranBomInputPath = testConstants.ranBomInputPath;
var contents = testConstants.contents;
var sourcemapContents = testConstants.sourcemapContents;
var bomContents = testConstants.bomContents;
var encodedContents = testConstants.encodedContents;

function makeSourceMap() {
  return {
    version: 3,
    file: inputRelative,
    names: [],
    mappings: "",
    sources: [inputRelative],
    sourcesContent: [contents],
  };
}

var clean = cleanup(outputBase);

describeStreams(".dest()", function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);

  var count = streamUtils.count;
  var rename = streamUtils.rename;
  var includes = streamUtils.includes;
  var slowCount = streamUtils.slowCount;
  var chunks = streamUtils.chunks;
  var concatArray = streamUtils.concatArray;
  var compareContents = streamUtils.compareContents;
  var fromError = streamUtils.fromError;

  beforeEach(clean);
  afterEach(clean);

  it("throws on no folder argument", (t) => {
    function noFolder() {
      vfs.dest();
    }
    t.assert.throws(noFolder, {
      message:
        "Invalid dest() folder argument. Please specify a non-empty string or a function.",
    });
  });

  it("throws on empty string folder argument", (t) => {
    function emptyFolder() {
      vfs.dest("");
    }
    t.assert.throws(emptyFolder, {
      message:
        "Invalid dest() folder argument. Please specify a non-empty string or a function.",
    });
  });

  it("accepts the sourcemap option as true", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: true }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("accepts the sourcemap option as a string", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 2);
      t.assert.strictEqual(files.includes(file), true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: "." }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("inline sourcemaps when option is true", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.match(
        files[0].contents.toString(),
        new RegExp(sourcemapContents),
      );
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: true }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("generates an extra File when option is a string", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 2);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.match(
        files[0].contents.toString(),
        new RegExp("//# sourceMappingURL=test.txt.map"),
      );
      t.assert.strictEqual(
        files[1].contents.toString(),
        JSON.stringify(makeSourceMap()),
      );
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: "." }),
        concatArray(assert),
      ],
      done,
    );
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
        vfs.dest(outputRelative, { cwd: __dirname }),
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

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("does not write null files", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var exists = fs.existsSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(exists, false);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("writes buffer files to the right folder with relative cwd", (t, done) => {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].cwd, __dirname);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(outputContents, contents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputRelative, { cwd: cwd }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("writes buffer files to the right folder with function and relative cwd", (t, done) => {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function outputFn(f) {
      t.assert.ok(f != null);
      t.assert.strictEqual(f, file);
      return outputRelative;
    }

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].cwd, __dirname);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(outputContents, contents);
    }

    pipeline(
      [from([file]), vfs.dest(outputFn, { cwd: cwd }), concatArray(assert)],
      done,
    );
  });

  it("writes buffer files to the right folder", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(outputContents, contents);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("writes streaming files to the right folder", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      t.assert.strictEqual(files[0].path, outputPath);
      t.assert.strictEqual(outputContents, contents);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("writes large streaming files to the right folder", (t, done) => {
    var size = 40000;

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: chunks(size),
    });

    function assert(files) {
      var stats = fs.lstatSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(stats.size, size);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("writes directories to the right folder", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.lstatSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(files[0].base, outputBase);
      // TODO: normalize this path
      t.assert.strictEqual(files[0].path, outputDirpath);
      t.assert.strictEqual(stats.isDirectory(), true);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("allows piping multiple dests in streaming mode", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert() {
      var outputContents1 = fs.readFileSync(outputPath, "utf8");
      var outputContents2 = fs.readFileSync(outputRenamePath, "utf8");
      t.assert.strictEqual(outputContents1, contents);
      t.assert.strictEqual(outputContents2, contents);
    }

    pipeline(
      [
        from([file]),
        includes({ path: inputPath }),
        vfs.dest(outputBase),
        rename(outputRenamePath),
        includes({ path: outputRenamePath }),
        vfs.dest(outputBase),
        concatArray(assert),
      ],
      done,
    );
  });

  it("writes new files with the default user mode", (t, done) => {
    var expectedMode = applyUmask("666");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(statMode(outputPath), expectedMode);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  // TODO this errored without other tests being active
  // Setup is somehow wrong
  it("reports i/o errors", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(err) {
      t.assert.ok(err != null);
      done();
    }

    fs.mkdirSync(outputBase);
    fs.closeSync(fs.openSync(outputPath, "w"));
    fs.chmodSync(outputPath, 0);

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it("reports stat errors", (t, done) => {
    var expectedMode = applyUmask("722");

    var fstatSpy = t.mock.method(fs, "fstat", mockError);

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
      t.assert.strictEqual(fstatSpy.mock.callCount(), 1);
      done();
    }

    fs.mkdirSync(outputBase);
    fs.closeSync(fs.openSync(outputPath, "w"));

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it("does not overwrite files with overwrite option set to false", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
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
        vfs.dest(outputBase, { overwrite: false }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("overwrites files with overwrite option set to true", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
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
        vfs.dest(outputBase, { overwrite: true }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not overwrite files with overwrite option set to a function that returns false", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
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
        vfs.dest(outputBase, { overwrite: overwrite }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("overwrites files with overwrite option set to a function that returns true", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
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
        vfs.dest(outputBase, { overwrite: overwrite }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("appends content with append option set to true", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputContents, existingContents + contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { append: true }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("appends content with append option set to a function that returns true", (t, done) => {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function append(f) {
      t.assert.strictEqual(f, file);
      return true;
    }

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputContents, existingContents + contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { append: append }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not do any transcoding with encoding defaulted (buffer)", (t, done) => {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: expectedContents,
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("does not do any transcoding with encoding option set to false (buffer)", (t, done) => {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: expectedContents,
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: false }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not do any transcoding with encoding defaulted (stream)", (t, done) => {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: fs.createReadStream(ranBomInputPath),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("does not do any transcoding with encoding option set to false (stream)", (t, done) => {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: fs.createReadStream(ranBomInputPath),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: false }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("transcodes utf8 to gb2312 with encoding option (buffer)", (t, done) => {
    var expectedContents = fs.readFileSync(encodedInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(encodedContents),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "gb2312" }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("transcodes utf8 to gb2312 with encoding option (stream)", (t, done) => {
    var expectedContents = fs.readFileSync(encodedInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([encodedContents]),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "gb2312" }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("sends utf8 downstream despite encoding option, preserve BOM if any (buffer)", (t, done) => {
    var expectedString = "\ufeff" + bomContents.replace("X", "16-BE");
    var expectedContents = Buffer.from(expectedString);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: expectedContents,
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isBuffer(), true);
      t.assert.deepStrictEqual(files[0].contents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "utf16be" }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("sends utf8 downstream despite encoding option, preserve BOM if any (stream)", (t, done) => {
    var expectedString = "\ufeff" + bomContents.replace("X", "16-BE");
    var expectedContents = Buffer.from(expectedString);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([expectedString]),
    });

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContents);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "utf16be" }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("reports unsupported encoding errors (buffer)", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 0);
    }

    function finish(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(err.message, "Unsupported encoding: fubar42");
      done();
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "fubar42" }),
        concatArray(assert),
      ],
      finish,
    );
  });

  it("reports unsupported encoding errors (stream)", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 0);
    }

    function finish(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(err.message, "Unsupported encoding: fubar42");
      done();
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "fubar42" }),
        concatArray(assert),
      ],
      finish,
    );
  });

  it("emits a finish event", (t, done) => {
    var destStream = vfs.dest(outputBase);

    var finished = false;
    destStream.once("finish", () => {
      finished = true;
    });

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from("1234567890"),
    });

    function finish() {
      t.assert.strictEqual(finished, true);
      done();
    }

    pipeline([from([file]), destStream], finish);
  });

  it("does not get clogged by highWaterMark", (t, done) => {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
      });
      highwatermarkFiles.push(file);
    }

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concat-stream cannot be used
        vfs.dest(outputBase),
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
        contents: Buffer.from(contents),
      });
      highwatermarkFiles.push(file);
    }

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        vfs.dest(outputBase),
        slowCount(expectedCount),
      ],
      done,
    );
  });

  it("respects readable listeners on destination stream", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var destStream = vfs.dest(outputBase);

    var readables = 0;
    destStream.on("readable", () => {
      var data = destStream.read();

      if (data != null) {
        readables++;
      }
    });

    function assert(err) {
      t.assert.strictEqual(readables, 1);
      done(err);
    }

    pipeline([from([file]), destStream], assert);
  });

  it("respects data listeners on destination stream", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var destStream = vfs.dest(outputBase);

    var datas = 0;
    destStream.on("data", () => {
      datas++;
    });

    function assert(err) {
      t.assert.strictEqual(datas, 1);
      done(err);
    }

    pipeline([from([file]), destStream], assert);
  });

  it("sinks the stream if all the readable event handlers are removed", (t, done) => {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
      });
      highwatermarkFiles.push(file);
    }

    var destStream = vfs.dest(outputBase);

    destStream.on("readable", noop);

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concat-stream cannot be used
        destStream,
      ],
      done,
    );

    process.nextTick(() => {
      destStream.removeListener("readable", noop);
    });
  });

  it("sinks the stream if all the data event handlers are removed", (t, done) => {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
      });
      highwatermarkFiles.push(file);
    }

    var destStream = vfs.dest(outputBase);

    destStream.on("data", noop);

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concat-stream cannot be used
        destStream,
      ],
      done,
    );

    process.nextTick(() => {
      destStream.removeListener("data", noop);
    });
  });

  it("successfully processes files with streaming contents", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    pipeline([from([file]), vfs.dest(outputBase)], done);
  });

  it("errors when a non-Vinyl object is emitted", (t, done) => {
    var file = {};

    function assert(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(
        err.message,
        "Received a non-Vinyl object in `dest()`",
      );
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it("errors when a buffer-mode stream is piped to it", (t, done) => {
    var file = Buffer.from("test");

    function assert(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(
        err.message,
        "Received a non-Vinyl object in `dest()`",
      );
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it("errors if we cannot mkdirp", (t, done) => {
    var mkdirSpy = t.mock.method(fs, "mkdir", mockError);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(mkdirSpy.mock.callCount(), 1);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it("errors if vinyl object is a directory and we cannot mkdirp", (t, done) => {
    var ogMkdir = fs.mkdir;

    var mkdirSpy = t.mock.method(fs, "mkdir", mockError);
    mkdirSpy.mock.mockImplementationOnce(ogMkdir, 0);

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(mkdirSpy.mock.callCount(), 2);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  // TODO: is this correct behavior? had to adjust it
  it("does not error if vinyl object is a directory and we cannot open it", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
        mode: applyUmask("000"),
      },
    });

    function assert() {
      var exists = fs.existsSync(outputDirpath);
      t.assert.strictEqual(exists, true);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("errors if vinyl object is a directory and open errors", (t, done) => {
    var openSpy = t.mock.method(fs, "open", mockError);

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(openSpy.mock.callCount(), 1);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it("errors if content stream errors", (t, done) => {
    var error = new Error("mocked error");

    var contentStream = fromError(error);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: contentStream,
    });

    function assert(err) {
      t.assert.strictEqual(err, error);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
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
      [from([file]), vfs.dest(outputBase, { read: read }), concatArray(assert)],
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
      t.assert.strictEqual(files[0], file);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("marshalls a Vinyl object without isSymbolic to a newer Vinyl", (t, done) => {
    var file = new File({
      base: outputBase,
      path: outputPath,
    });

    breakPrototype(file);

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      // Avoid comparing stats because they get reflected
      files[0].stat = file.stat;
      t.assert.partialDeepStrictEqual(files[0], file);
      t.assert.notStrictEqual(files[0], file);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });
});
