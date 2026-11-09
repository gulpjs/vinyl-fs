"use strict";

var path = require("node:path");
var assert = require("node:assert");
var { afterEach, beforeEach, it } = require("node:test");

var fs = require("graceful-fs");
var File = require("vinyl");

var vfs = require("../");

var cleanup = require("./utils/cleanup");
var testStreams = require("./utils/test-streams");
var testConstants = require("./utils/test-constants");
var describeStreams = require("./utils/suite");

var inputBase = testConstants.inputBase;
var inputPath = testConstants.inputPath;
var outputBase = testConstants.outputBase;
var outputPath = testConstants.outputPath;
var inputDirpath = testConstants.inputDirpath;
var bomInputPath = testConstants.bomInputPath;
var beBomInputPath = testConstants.beBomInputPath;
var leBomInputPath = testConstants.leBomInputPath;
var beNotBomInputPath = testConstants.beNotBomInputPath;
var leNotBomInputPath = testConstants.leNotBomInputPath;
var ranBomInputPath = testConstants.ranBomInputPath;
var encodedInputPath = testConstants.encodedInputPath;
var encodedContents = testConstants.encodedContents;
var bomContents = testConstants.bomContents;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

describeStreams(".src()", (stream) => {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var concatArray = streamUtils.concatArray;
  var compareContents = streamUtils.compareContents;

  beforeEach(clean);
  afterEach(clean);

  it("throws on invalid glob (empty)", (t, done) => {
    var stream;
    try {
      stream = vfs.src();
    } catch (err) {
      t.assert.ok(err != null);
      t.assert.ok(stream === undefined);
      done();
    }
  });

  it("throws on invalid glob (empty string)", (t, done) => {
    var stream;
    try {
      stream = vfs.src("");
    } catch (err) {
      t.assert.ok(err != null);
      t.assert.ok(stream === undefined);
      done();
    }
  });

  it("throws on invalid glob (number)", (t, done) => {
    var stream;
    try {
      stream = vfs.src(123);
    } catch (err) {
      t.assert.ok(err != null);
      t.assert.ok(stream === undefined);
      done();
    }
  });

  it("throws on invalid glob (nested array)", (t, done) => {
    var stream;
    try {
      stream = vfs.src([["./fixtures/*.coffee"]]);
    } catch (err) {
      t.assert.ok(err != null);
      t.assert.ok(stream === undefined);
      t.assert.match(err.message, /Invalid glob argument/);
      done();
    }
  });

  it("throws on invalid glob (empty string in array)", (t, done) => {
    var stream;
    try {
      stream = vfs.src([""]);
    } catch (err) {
      t.assert.ok(err != null);
      t.assert.ok(stream === undefined);
      done();
    }
  });

  it("throws on invalid glob (empty array)", (t, done) => {
    var stream;
    try {
      stream = vfs.src([]);
    } catch (err) {
      t.assert.ok(err != null);
      t.assert.ok(stream === undefined);
      done();
    }
  });

  it("supports arrays of globs", (t, done) => {
    var cwd = path.relative(process.cwd(), __dirname);

    var stream = vfs.src(["./fixtures/test.txt", "./fixtures/bom-*.txt"], {
      cwd: cwd,
    });
    t.assert.ok(stream != null);
    done();
  });

  it("emits an error on file not existing", (t, done) => {
    function assert(err) {
      t.assert.ok(err != null);
      done();
    }

    pipeline([vfs.src("./fixtures/noexist.coffee"), concatArray()], assert);
  });

  it("passes through writes", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: fs.statSync(inputPath),
    });

    var srcStream = vfs.src(inputPath);

    function assert(files) {
      t.assert.strictEqual(files.length, 2);
      t.assert.strictEqual(files[0], file);
    }

    srcStream.write(file);

    pipeline([srcStream, concatArray(assert)], done);
  });

  it("removes BOM from utf8-encoded files by default (buffer)", (t, done) => {
    var expectedContent = Buffer.from(bomContents.replace("X", "8"));

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline([vfs.src(bomInputPath), concatArray(assert)], done);
  });

  it("removes BOM from utf8-encoded files by default (stream)", (t, done) => {
    var expectedContent = Buffer.from(bomContents.replace("X", "8"));

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContent);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(bomInputPath, { buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not remove BOM from utf8-encoded files if option is false (buffer)", (t, done) => {
    var expectedContent = Buffer.from("\ufeff" + bomContents.replace("X", "8"));

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [vfs.src(bomInputPath, { removeBOM: false }), concatArray(assert)],
      done,
    );
  });

  it("does not remove BOM from utf8-encoded files if option is false (stream)", (t, done) => {
    var expectedContent = Buffer.from("\ufeff" + bomContents.replace("X", "8"));

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContent);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(bomInputPath, { removeBOM: false, buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("removes BOM from utf16be-encoded files by default (buffer)", (t, done) => {
    var expectedContent = Buffer.from(bomContents.replace("X", "16-BE"));

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [vfs.src(beBomInputPath, { encoding: "utf16be" }), concatArray(assert)],
      done,
    );
  });

  it("removes BOM from utf16be-encoded files by default (stream)", (t, done) => {
    var expectedContent = Buffer.from(bomContents.replace("X", "16-BE"));

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContent);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, { encoding: "utf16be", buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not remove BOM from utf16be-encoded files if option is false (buffer)", (t, done) => {
    var expectedContent = Buffer.from(
      "\ufeff" + bomContents.replace("X", "16-BE"),
    );

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, { encoding: "utf16be", removeBOM: false }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not remove BOM from utf16be-encoded files if option is false (stream)", (t, done) => {
    var expectedContent = Buffer.from(
      "\ufeff" + bomContents.replace("X", "16-BE"),
    );

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContent);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, {
          encoding: "utf16be",
          removeBOM: false,
          buffer: false,
        }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("removes BOM from utf16le-encoded files by default (buffer)", (t, done) => {
    var expectedContent = Buffer.from(bomContents.replace("X", "16-LE"));

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [vfs.src(leBomInputPath, { encoding: "utf16le" }), concatArray(assert)],
      done,
    );
  });

  it("removes BOM from utf16le-encoded files by default (stream)", (t, done) => {
    var expectedContent = Buffer.from(bomContents.replace("X", "16-LE"));

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContent);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, { encoding: "utf16le", buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not remove BOM from utf16le-encoded files if option is false (buffer)", (t, done) => {
    var expectedContent = Buffer.from(
      "\ufeff" + bomContents.replace("X", "16-LE"),
    );

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, { encoding: "utf16le", removeBOM: false }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not remove BOM from utf16le-encoded files if option is false (stream)", (t, done) => {
    var expectedContent = Buffer.from(
      "\ufeff" + bomContents.replace("X", "16-LE"),
    );

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContent);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, {
          encoding: "utf16le",
          removeBOM: false,
          buffer: false,
        }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  // This goes for any non-UTF-8 encoding.
  // UTF-16-BE is enough to demonstrate this is done properly.
  it("does not remove anything that looks like a utf8-encoded BOM from utf16be-encoded files (buffer)", (t, done) => {
    var expectedContent = fs.readFileSync(beNotBomInputPath);

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [vfs.src(beNotBomInputPath, { encoding: false }), concatArray(assert)],
      done,
    );
  });

  it("does not remove anything that looks like a utf8-encoded BOM from utf16be-encoded files (stream)", (t, done) => {
    var expectedContent = fs.readFileSync(beNotBomInputPath);

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContent);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(beNotBomInputPath, { buffer: false, encoding: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  // This goes for any non-UTF-8 encoding.
  // UTF-16-LE is enough to demonstrate this is done properly.
  it("does not remove anything that looks like a utf8-encoded BOM from utf16le-encoded files (buffer)", (t, done) => {
    var expectedContent = fs.readFileSync(leNotBomInputPath);

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [vfs.src(leNotBomInputPath, { encoding: false }), concatArray(assert)],
      done,
    );
  });

  it("does not remove anything that looks like a utf8-encoded BOM from utf16le-encoded files (stream)", (t, done) => {
    var expectedContent = fs.readFileSync(leNotBomInputPath);

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContent);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(leNotBomInputPath, { buffer: false, encoding: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not do any transcoding with encoding option set to false (buffer)", (t, done) => {
    var expectedContents = fs.readFileSync(ranBomInputPath);

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContents);
    }

    pipeline(
      [vfs.src(ranBomInputPath, { encoding: false }), concatArray(assert)],
      done,
    );
  });

  it("does not do any transcoding with encoding option set to false (stream)", (t, done) => {
    var expectedContents = fs.readFileSync(ranBomInputPath);

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContents);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(ranBomInputPath, { encoding: false, buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not remove utf8 BOM with encoding option set to false (buffer)", (t, done) => {
    var expectedContents = fs.readFileSync(bomInputPath);

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContents);
    }

    pipeline(
      [vfs.src(bomInputPath, { encoding: false }), concatArray(assert)],
      done,
    );
  });

  it("does not remove utf8 BOM with encoding option set to false (stream)", (t, done) => {
    var expectedContents = fs.readFileSync(bomInputPath);

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContents);
    }
    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(bomInputPath, { encoding: false, buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("transcodes gb2312 to utf8 with encoding option (buffer)", (t, done) => {
    var expectedContents = Buffer.from(encodedContents);

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.deepStrictEqual(files[0].contents, expectedContents);
    }

    pipeline(
      [vfs.src(encodedInputPath, { encoding: "gb2312" }), concatArray(assert)],
      done,
    );
  });

  it("transcodes gb2312 to utf8 with encoding option (stream)", (t, done) => {
    var expectedContents = Buffer.from(encodedContents);

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContents);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(encodedInputPath, { encoding: "gb2312", buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("reports unsupported encoding errors (buffer)", (t, done) => {
    function assert(files) {
      t.assert.strictEqual(files.length, 0);
    }

    function finish(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(err.message, "Unsupported encoding: fubar42");
      done();
    }

    pipeline(
      [vfs.src(inputPath, { encoding: "fubar42" }), concatArray(assert)],
      finish,
    );
  });

  it("reports unsupported encoding errors (stream)", (t, done) => {
    // assert isn't being called here is this an error checker.
    function assert(files) {
      t.assert.strictEqual(files.length, 2);
    }

    function finish(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(err.message, "Unsupported encoding: fubar42");
      done();
    }

    pipeline(
      [
        vfs.src(inputPath, { encoding: "fubar42", buffer: false }),
        concatArray(assert),
      ],
      finish,
    );
  });

  it("globs files with default settings", (t, done) => {
    function assert(files) {
      t.assert.strictEqual(files.length, 7);
    }

    pipeline(
      [vfs.src("./fixtures/*.txt", { cwd: __dirname }), concatArray(assert)],
      done,
    );
  });

  it("globs files with default settings and relative cwd", (t, done) => {
    var cwd = path.relative(process.cwd(), __dirname);

    function assert(files) {
      t.assert.strictEqual(files.length, 7);
    }

    pipeline(
      [vfs.src("./fixtures/*.txt", { cwd: cwd }), concatArray(assert)],
      done,
    );
  });

  it("supports glob negation with ../ paths (issue 306)", (t, done) => {
    var cwd = path.relative(process.cwd(), __dirname);

    function assert(files) {
      t.assert.strictEqual(files.length, 4);
    }

    pipeline(
      [
        vfs.src(["../test/fixtures/*.txt", "!../test/fixtures/bom-*.txt"], {
          cwd: cwd,
        }),
        concatArray(assert),
      ],
      done,
    );
  });

  // TODO: need to normalize the path of a directory vinyl object
  it("globs a directory with default settings", (t, done) => {
    var inputDirGlob = path.join(inputBase, "./f*/");

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isNull(), true);
      t.assert.strictEqual(files[0].isDirectory(), true);
    }

    pipeline([vfs.src(inputDirGlob), concatArray(assert)], done);
  });

  it("globs a directory with default settings and relative cwd", (t, done) => {
    var cwd = path.relative(process.cwd(), __dirname);

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isNull(), true);
      t.assert.strictEqual(files[0].isDirectory(), true);
    }

    pipeline(
      [vfs.src("./fixtures/f*/", { cwd: cwd }), concatArray(assert)],
      done,
    );
  });

  it("streams a directory with default settings", (t, done) => {
    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].path, inputDirpath);
      t.assert.strictEqual(files[0].isNull(), true);
      t.assert.strictEqual(files[0].isDirectory(), true);
    }

    pipeline([vfs.src(inputDirpath), concatArray(assert)], done);
  });

  it("streams file with with no contents using read: false option", (t, done) => {
    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].path, inputPath);
      t.assert.strictEqual(files[0].isNull(), true);
      t.assert.strictEqual(files[0].contents, null);
    }

    pipeline([vfs.src(inputPath, { read: false }), concatArray(assert)], done);
  });

  it("streams a file changed after since", (t, done) => {
    var lastUpdateDate = new Date(+fs.statSync(inputPath).mtime - 1000);

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].path, inputPath);
    }

    pipeline(
      [vfs.src(inputPath, { since: lastUpdateDate }), concatArray(assert)],
      done,
    );
  });

  it("does not stream a file changed before since", (t, done) => {
    var lastUpdateDate = new Date(+fs.statSync(inputPath).mtime + 1000);

    function assert(files) {
      t.assert.strictEqual(files.length, 0);
    }

    pipeline(
      [vfs.src(inputPath, { since: lastUpdateDate }), concatArray(assert)],
      done,
    );
  });

  it("streams a file with ctime greater than mtime", (t, done) => {
    fs.mkdirSync(outputBase);
    fs.copyFileSync(inputPath, outputPath);

    var renamedPath = path.join(outputBase, "foo.txt");

    setTimeout(function () {
      // rename changes ctime but not mtime
      fs.renameSync(outputPath, renamedPath);

      var stat = fs.statSync(renamedPath);

      t.assert.strictEqual(+stat.ctime >= +stat.mtime, true);

      var lastMtime = new Date(+stat.mtime);

      function assert(files) {
        t.assert.strictEqual(files.length, 1);
        t.assert.strictEqual(files[0].path, renamedPath);
      }

      pipeline(
        [vfs.src(renamedPath, { since: lastMtime }), concatArray(assert)],
        done,
      );
    }, 250);
  });

  it("streams a file with streaming contents", (t, done) => {
    var expectedContent = fs.readFileSync(inputPath);

    function assertContent(contents) {
      t.assert.deepStrictEqual(contents, expectedContent);
    }

    function assert(files) {
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].path, inputPath);
      t.assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(inputPath, { buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done,
    );
  });

  it("can be used as a through stream and adds new files to the end", (t, done) => {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: fs.readFileSync(inputPath),
      stat: fs.statSync(inputPath),
    });

    function assert(files) {
      t.assert.strictEqual(files.length, 2);
      t.assert.strictEqual(files[0], file);
    }

    pipeline([from([file]), vfs.src(inputPath), concatArray(assert)], done);
  });

  it("can be used at beginning and in the middle", (t, done) => {
    function assert(files) {
      t.assert.strictEqual(files.length, 2);
    }

    pipeline(
      [vfs.src(inputPath), vfs.src(inputPath), concatArray(assert)],
      done,
    );
  });

  it("does not pass options on to stream", (t, done) => {
    // Reference: https://github.com/gulpjs/vinyl-fs/issues/153
    var read = t.mock.fn(() => false);

    function assert() {
      // Called once to resolve the option
      t.assert.strictEqual(read.mock.callCount(), 1);
    }

    pipeline([vfs.src(inputPath, { read: read }), concatArray(assert)], done);
  });
});
