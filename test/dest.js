"use strict";

var path = require("node:path");
var assert = require("node:assert");
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

  it("throws on no folder argument", function () {
    function noFolder() {
      vfs.dest();
    }
    assert.throws(noFolder, {
      message:
        "Invalid dest() folder argument. Please specify a non-empty string or a function.",
    });
  });

  it("throws on empty string folder argument", function () {
    function emptyFolder() {
      vfs.dest("");
    }
    assert.throws(emptyFolder, {
      message:
        "Invalid dest() folder argument. Please specify a non-empty string or a function.",
    });
  });

  it("accepts the sourcemap option as true", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: true }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("accepts the sourcemap option as a string", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assertion(files) {
      assert.strictEqual(files.length, 2);
      assert.strictEqual(files.includes(file), true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: "." }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("inlines sourcemaps when option is true", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.match(files[0].contents.toString(), new RegExp(sourcemapContents));
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: true }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("generates an extra File when option is a string", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assertion(files) {
      assert.strictEqual(files.length, 2);
      assert.strictEqual(files.includes(file), true);
      assert.match(
        files[0].contents.toString(),
        new RegExp("//# sourceMappingURL=test.txt.map"),
      );
      assert.strictEqual(
        files[1].contents.toString(),
        JSON.stringify(makeSourceMap()),
      );
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: "." }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("passes through writes with cwd", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].cwd, __dirname);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputRelative, { cwd: __dirname }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("passes through writes with default cwd", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].cwd, process.cwd());
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("does not write null files", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assertion(files) {
      var exists = fs.existsSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(exists, false);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("writes buffer files to the right folder with relative cwd", function (t, done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].cwd, __dirname);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(outputContents, contents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputRelative, { cwd: cwd }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("writes buffer files to the right folder with function and relative cwd", function (t, done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function outputFn(f) {
      assert.ok(f != null);
      assert.strictEqual(f, file);
      return outputRelative;
    }

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].cwd, __dirname);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(outputContents, contents);
    }

    pipeline(
      [from([file]), vfs.dest(outputFn, { cwd: cwd }), concatArray(assertion)],
      done,
    );
  });

  it("writes buffer files to the right folder", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(outputContents, contents);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("writes streaming files to the right folder", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(outputContents, contents);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("writes large streaming files to the right folder", function (t, done) {
    var size = 40000;

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: chunks(size),
    });

    function assertion(files) {
      var stats = fs.lstatSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(stats.size, size);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("writes directories to the right folder", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assertion(files) {
      var stats = fs.lstatSync(outputDirpath);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      // TODO: normalize this path
      assert.strictEqual(files[0].path, outputDirpath);
      assert.strictEqual(stats.isDirectory(), true);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("allows piping multiple dests in streaming mode", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion() {
      var outputContents1 = fs.readFileSync(outputPath, "utf8");
      var outputContents2 = fs.readFileSync(outputRenamePath, "utf8");
      assert.strictEqual(outputContents1, contents);
      assert.strictEqual(outputContents2, contents);
    }

    pipeline(
      [
        from([file]),
        includes({ path: inputPath }),
        vfs.dest(outputBase),
        rename(outputRenamePath),
        includes({ path: outputRenamePath }),
        vfs.dest(outputBase),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("writes new files with the default user mode", function (t, done) {
    var expectedMode = applyUmask("666");

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(statMode(outputPath), expectedMode);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  // TODO this errored without other tests being active
  // Setup is somehow wrong
  it("reports i/o errors", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion(err) {
      assert.ok(err != null);
      done();
    }

    fs.mkdirSync(outputBase);
    fs.closeSync(fs.openSync(outputPath, "w"));
    fs.chmodSync(outputPath, 0);

    pipeline([from([file]), vfs.dest(outputBase)], assertion);
  });

  it("reports stat errors", function (t, done) {
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

    function assertion(err) {
      assert.ok(err != null);
      assert.strictEqual(fstatSpy.mock.callCount(), 1);
      done();
    }

    fs.mkdirSync(outputBase);
    fs.closeSync(fs.openSync(outputPath, "w"));

    pipeline([from([file]), vfs.dest(outputBase)], assertion);
  });

  it("does not overwrite files with overwrite option set to false", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(outputContents, existingContents);
    }

    // Write expected file which should not be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { overwrite: false }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("overwrites files with overwrite option set to true", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(outputContents, contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { overwrite: true }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not overwrite files with overwrite option set to a function that returns false", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function overwrite(f) {
      assert.strictEqual(f, file);
      return false;
    }

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(outputContents, existingContents);
    }

    // Write expected file which should not be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { overwrite: overwrite }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("overwrites files with overwrite option set to a function that returns true", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function overwrite(f) {
      assert.strictEqual(f, file);
      return true;
    }

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(outputContents, contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { overwrite: overwrite }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("appends content with append option set to true", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(outputContents, existingContents + contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { append: true }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("appends content with append option set to a function that returns true", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function append(f) {
      assert.strictEqual(f, file);
      return true;
    }

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath, "utf8");

      assert.strictEqual(files.length, 1);
      assert.strictEqual(outputContents, existingContents + contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { append: append }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not do any transcoding with encoding defaulted (buffer)", function (t, done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: expectedContents,
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("does not do any transcoding with encoding option set to false (buffer)", function (t, done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: expectedContents,
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: false }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not do any transcoding with encoding defaulted (stream)", function (t, done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: fs.createReadStream(ranBomInputPath),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("does not do any transcoding with encoding option set to false (stream)", function (t, done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: fs.createReadStream(ranBomInputPath),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: false }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("transcodes utf8 to gb2312 with encoding option (buffer)", function (t, done) {
    var expectedContents = fs.readFileSync(encodedInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(encodedContents),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "gb2312" }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("transcodes utf8 to gb2312 with encoding option (stream)", function (t, done) {
    var expectedContents = fs.readFileSync(encodedInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([encodedContents]),
    });

    function assertion(files) {
      var outputContents = fs.readFileSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(outputContents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "gb2312" }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("sends utf8 downstream despite encoding option, preserve BOM if any (buffer)", function (t, done) {
    var expectedString = "\ufeff" + bomContents.replace("X", "16-BE");
    var expectedContents = Buffer.from(expectedString);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: expectedContents,
    });

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isBuffer(), true);
      assert.deepStrictEqual(files[0].contents, expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "utf16be" }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("sends utf8 downstream despite encoding option, preserve BOM if any (stream)", function (t, done) {
    var expectedString = "\ufeff" + bomContents.replace("X", "16-BE");
    var expectedContents = Buffer.from(expectedString);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([expectedString]),
    });

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContents);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "utf16be" }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("reports unsupported encoding errors (buffer)", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion(files) {
      assert.strictEqual(files.length, 0);
    }

    function finish(err) {
      assert.ok(err != null);
      assert.strictEqual(err.message, "Unsupported encoding: fubar42");
      done();
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "fubar42" }),
        concatArray(assertion),
      ],
      finish,
    );
  });

  it("reports unsupported encoding errors (stream)", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assertion(files) {
      assert.strictEqual(files.length, 0);
    }

    function finish(err) {
      assert.ok(err != null);
      assert.strictEqual(err.message, "Unsupported encoding: fubar42");
      done();
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: "fubar42" }),
        concatArray(assertion),
      ],
      finish,
    );
  });

  it("emits a finish event", function (t, done) {
    var destStream = vfs.dest(outputBase);

    var finished = false;
    destStream.once("finish", function () {
      finished = true;
    });

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from("1234567890"),
    });

    function finish() {
      assert.strictEqual(finished, true);
      done();
    }

    pipeline([from([file]), destStream], finish);
  });

  it("does not get clogged by highWaterMark", function (t, done) {
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

  it("allows backpressure when piped to another, slower stream", function (t, done) {
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

  it("respects readable listeners on destination stream", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var destStream = vfs.dest(outputBase);

    var readables = 0;
    destStream.on("readable", function () {
      var data = destStream.read();

      if (data != null) {
        readables++;
      }
    });

    function assertion(err) {
      assert.strictEqual(readables, 1);
      done(err);
    }

    pipeline([from([file]), destStream], assertion);
  });

  it("respects data listeners on destination stream", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var destStream = vfs.dest(outputBase);

    var datas = 0;
    destStream.on("data", function () {
      datas++;
    });

    function assertion(err) {
      assert.strictEqual(datas, 1);
      done(err);
    }

    pipeline([from([file]), destStream], assertion);
  });

  it("sinks the stream if all the readable event handlers are removed", function (t, done) {
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

    process.nextTick(function () {
      destStream.removeListener("readable", noop);
    });
  });

  it("sinks the stream if all the data event handlers are removed", function (t, done) {
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

    process.nextTick(function () {
      destStream.removeListener("data", noop);
    });
  });

  it("successfully processes files with streaming contents", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    pipeline([from([file]), vfs.dest(outputBase)], done);
  });

  it("errors when a non-Vinyl object is emitted", function (t, done) {
    var file = {};

    function assertion(err) {
      assert.ok(err != null);
      assert.strictEqual(
        err.message,
        "Received a non-Vinyl object in `dest()`",
      );
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assertion);
  });

  it("errors when a buffer-mode stream is piped to it", function (t, done) {
    var file = Buffer.from("test");

    function assertion(err) {
      assert.ok(err != null);
      assert.strictEqual(
        err.message,
        "Received a non-Vinyl object in `dest()`",
      );
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assertion);
  });

  it("errors if we cannot mkdirp", function (t, done) {
    var mkdirSpy = t.mock.method(fs, "mkdir", mockError);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assertion(err) {
      assert.ok(err != null);
      assert.strictEqual(mkdirSpy.mock.callCount(), 1);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assertion);
  });

  it("errors if vinyl object is a directory and we cannot mkdirp", function (t, done) {
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

    function assertion(err) {
      assert.ok(err != null);
      assert.strictEqual(mkdirSpy.mock.callCount(), 2);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assertion);
  });

  // TODO: is this correct behavior? had to adjust it
  it("does not error if vinyl object is a directory and we cannot open it", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
        mode: applyUmask("000"),
      },
    });

    function assertion() {
      var exists = fs.existsSync(outputDirpath);
      assert.strictEqual(exists, true);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("errors if vinyl object is a directory and open errors", function (t, done) {
    var openSpy = t.mock.method(fs, "open", mockError);

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assertion(err) {
      assert.ok(err != null);
      assert.strictEqual(openSpy.mock.callCount(), 1);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assertion);
  });

  it("errors if content stream errors", function (t, done) {
    var error = new Error("mocked error");

    var contentStream = fromError(error);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: contentStream,
    });

    function assertion(err) {
      assert.strictEqual(err, error);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assertion);
  });

  it("does not pass options on to stream", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    // Reference: https://github.com/gulpjs/vinyl-fs/issues/153
    var read = t.mock.fn(() => false);

    function assertion() {
      // Called never because it's not a valid option
      assert.strictEqual(read.mock.callCount(), 0);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { read: read }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not marshall a Vinyl object with isSymbolic method", function (t, done) {
    var file = new File({
      base: outputBase,
      path: outputPath,
    });

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0], file);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("marshalls a Vinyl object without isSymbolic to a newer Vinyl", function (t, done) {
    var file = new File({
      base: outputBase,
      path: outputPath,
    });

    breakPrototype(file);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      // Avoid comparing stats because they get reflected
      files[0].stat = file.stat;
      assert.deepStrictEqual(files[0], file);
      assert.notStrictEqual(files[0], file);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });
});
