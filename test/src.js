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

describeStreams(".src()", function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var concatArray = streamUtils.concatArray;
  var compareContents = streamUtils.compareContents;

  beforeEach(clean);
  afterEach(clean);

  it("throws on invalid glob (empty)", function (t, done) {
    var stream;
    try {
      stream = vfs.src();
    } catch (err) {
      assert.ok(err != null);
      assert.ok(stream === undefined);
      done();
    }
  });

  it("throws on invalid glob (empty string)", function (t, done) {
    var stream;
    try {
      stream = vfs.src("");
    } catch (err) {
      assert.ok(err != null);
      assert.ok(stream === undefined);
      done();
    }
  });

  it("throws on invalid glob (number)", function (t, done) {
    var stream;
    try {
      stream = vfs.src(123);
    } catch (err) {
      assert.ok(err != null);
      assert.ok(stream === undefined);
      done();
    }
  });

  it("throws on invalid glob (nested array)", function (t, done) {
    var stream;
    try {
      stream = vfs.src([["./fixtures/*.coffee"]]);
    } catch (err) {
      assert.ok(err != null);
      assert.ok(stream === undefined);
      assert.match(err.message, /Invalid glob argument/);
      done();
    }
  });

  it("throws on invalid glob (empty string in array)", function (t, done) {
    var stream;
    try {
      stream = vfs.src([""]);
    } catch (err) {
      assert.ok(err != null);
      assert.ok(stream === undefined);
      done();
    }
  });

  it("throws on invalid glob (empty array)", function (t, done) {
    var stream;
    try {
      stream = vfs.src([]);
    } catch (err) {
      assert.ok(err != null);
      assert.ok(stream === undefined);
      done();
    }
  });

  it("supports arrays of globs", function (t, done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var stream = vfs.src(["./fixtures/test.txt", "./fixtures/bom-*.txt"], {
      cwd: cwd,
    });
    assert.ok(stream != null);
    done();
  });

  it("emits an error on file not existing", function (t, done) {
    function assertion(err) {
      assert.ok(err != null);
      done();
    }

    pipeline([vfs.src("./fixtures/noexist.coffee"), concatArray()], assertion);
  });

  it("passes through writes", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: fs.statSync(inputPath),
    });

    var srcStream = vfs.src(inputPath);

    function assertion(files) {
      assert.strictEqual(files.length, 2);
      assert.strictEqual(files[0], file);
    }

    srcStream.write(file);

    pipeline([srcStream, concatArray(assertion)], done);
  });

  it("removes BOM from utf8-encoded files by default (buffer)", function (t, done) {
    var expectedContent = Buffer.from(bomContents.replace("X", "8"));

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline([vfs.src(bomInputPath), concatArray(assertion)], done);
  });

  it("removes BOM from utf8-encoded files by default (stream)", function (t, done) {
    var expectedContent = Buffer.from(bomContents.replace("X", "8"));

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContent);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(bomInputPath, { buffer: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not remove BOM from utf8-encoded files if option is false (buffer)", function (t, done) {
    var expectedContent = Buffer.from("\ufeff" + bomContents.replace("X", "8"));

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [vfs.src(bomInputPath, { removeBOM: false }), concatArray(assertion)],
      done,
    );
  });

  it("does not remove BOM from utf8-encoded files if option is false (stream)", function (t, done) {
    var expectedContent = Buffer.from("\ufeff" + bomContents.replace("X", "8"));

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContent);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(bomInputPath, { removeBOM: false, buffer: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("removes BOM from utf16be-encoded files by default (buffer)", function (t, done) {
    var expectedContent = Buffer.from(bomContents.replace("X", "16-BE"));

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, { encoding: "utf16be" }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("removes BOM from utf16be-encoded files by default (stream)", function (t, done) {
    var expectedContent = Buffer.from(bomContents.replace("X", "16-BE"));

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContent);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, { encoding: "utf16be", buffer: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not remove BOM from utf16be-encoded files if option is false (buffer)", function (t, done) {
    var expectedContent = Buffer.from(
      "\ufeff" + bomContents.replace("X", "16-BE"),
    );

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, { encoding: "utf16be", removeBOM: false }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not remove BOM from utf16be-encoded files if option is false (stream)", function (t, done) {
    var expectedContent = Buffer.from(
      "\ufeff" + bomContents.replace("X", "16-BE"),
    );

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContent);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, {
          encoding: "utf16be",
          removeBOM: false,
          buffer: false,
        }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("removes BOM from utf16le-encoded files by default (buffer)", function (t, done) {
    var expectedContent = Buffer.from(bomContents.replace("X", "16-LE"));

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, { encoding: "utf16le" }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("removes BOM from utf16le-encoded files by default (stream)", function (t, done) {
    var expectedContent = Buffer.from(bomContents.replace("X", "16-LE"));

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContent);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, { encoding: "utf16le", buffer: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not remove BOM from utf16le-encoded files if option is false (buffer)", function (t, done) {
    var expectedContent = Buffer.from(
      "\ufeff" + bomContents.replace("X", "16-LE"),
    );

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, { encoding: "utf16le", removeBOM: false }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not remove BOM from utf16le-encoded files if option is false (stream)", function (t, done) {
    var expectedContent = Buffer.from(
      "\ufeff" + bomContents.replace("X", "16-LE"),
    );

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContent);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, {
          encoding: "utf16le",
          removeBOM: false,
          buffer: false,
        }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  // This goes for any non-UTF-8 encoding.
  // UTF-16-BE is enough to demonstrate this is done properly.
  it("does not remove anything that looks like a utf8-encoded BOM from utf16be-encoded files (buffer)", function (t, done) {
    var expectedContent = fs.readFileSync(beNotBomInputPath);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [vfs.src(beNotBomInputPath, { encoding: false }), concatArray(assertion)],
      done,
    );
  });

  it("does not remove anything that looks like a utf8-encoded BOM from utf16be-encoded files (stream)", function (t, done) {
    var expectedContent = fs.readFileSync(beNotBomInputPath);

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContent);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(beNotBomInputPath, { buffer: false, encoding: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  // This goes for any non-UTF-8 encoding.
  // UTF-16-LE is enough to demonstrate this is done properly.
  it("does not remove anything that looks like a utf8-encoded BOM from utf16le-encoded files (buffer)", function (t, done) {
    var expectedContent = fs.readFileSync(leNotBomInputPath);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContent);
    }

    pipeline(
      [vfs.src(leNotBomInputPath, { encoding: false }), concatArray(assertion)],
      done,
    );
  });

  it("does not remove anything that looks like a utf8-encoded BOM from utf16le-encoded files (stream)", function (t, done) {
    var expectedContent = fs.readFileSync(leNotBomInputPath);

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContent);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(leNotBomInputPath, { buffer: false, encoding: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not do any transcoding with encoding option set to false (buffer)", function (t, done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContents);
    }

    pipeline(
      [vfs.src(ranBomInputPath, { encoding: false }), concatArray(assertion)],
      done,
    );
  });

  it("does not do any transcoding with encoding option set to false (stream)", function (t, done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContents);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(ranBomInputPath, { encoding: false, buffer: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not remove utf8 BOM with encoding option set to false (buffer)", function (t, done) {
    var expectedContents = fs.readFileSync(bomInputPath);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContents);
    }

    pipeline(
      [vfs.src(bomInputPath, { encoding: false }), concatArray(assertion)],
      done,
    );
  });

  it("does not remove utf8 BOM with encoding option set to false (stream)", function (t, done) {
    var expectedContents = fs.readFileSync(bomInputPath);

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContents);
    }
    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(bomInputPath, { encoding: false, buffer: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("transcodes gb2312 to utf8 with encoding option (buffer)", function (t, done) {
    var expectedContents = Buffer.from(encodedContents);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.deepStrictEqual(files[0].contents, expectedContents);
    }

    pipeline(
      [
        vfs.src(encodedInputPath, { encoding: "gb2312" }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("transcodes gb2312 to utf8 with encoding option (stream)", function (t, done) {
    var expectedContents = Buffer.from(encodedContents);

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContents);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(encodedInputPath, { encoding: "gb2312", buffer: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("reports unsupported encoding errors (buffer)", function (t, done) {
    function assertion(files) {
      assert.strictEqual(files.length, 0);
    }

    function finish(err) {
      assert.ok(err != null);
      assert.strictEqual(err.message, "Unsupported encoding: fubar42");
      done();
    }

    pipeline(
      [vfs.src(inputPath, { encoding: "fubar42" }), concatArray(assertion)],
      finish,
    );
  });

  it("reports unsupported encoding errors (stream)", function (t, done) {
    // assertion isn't being called here is this an error checker.
    function assertion(files) {
      assert.strictEqual(files.length, 2);
    }

    function finish(err) {
      assert.ok(err != null);
      assert.strictEqual(err.message, "Unsupported encoding: fubar42");
      done();
    }

    pipeline(
      [
        vfs.src(inputPath, { encoding: "fubar42", buffer: false }),
        concatArray(assertion),
      ],
      finish,
    );
  });

  it("globs files with default settings", function (t, done) {
    function assertion(files) {
      assert.strictEqual(files.length, 7);
    }

    pipeline(
      [vfs.src("./fixtures/*.txt", { cwd: __dirname }), concatArray(assertion)],
      done,
    );
  });

  it("globs files with default settings and relative cwd", function (t, done) {
    var cwd = path.relative(process.cwd(), __dirname);

    function assertion(files) {
      assert.strictEqual(files.length, 7);
    }

    pipeline(
      [vfs.src("./fixtures/*.txt", { cwd: cwd }), concatArray(assertion)],
      done,
    );
  });

  it("supports glob negation with ../ paths (issue 306)", function (t, done) {
    var cwd = path.relative(process.cwd(), __dirname);

    function assertion(files) {
      assert.strictEqual(files.length, 4);
    }

    pipeline(
      [
        vfs.src(["../test/fixtures/*.txt", "!../test/fixtures/bom-*.txt"], {
          cwd: cwd,
        }),
        concatArray(assertion),
      ],
      done,
    );
  });

  // TODO: need to normalize the path of a directory vinyl object
  it("globs a directory with default settings", function (t, done) {
    var inputDirGlob = path.join(inputBase, "./f*/");

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isNull(), true);
      assert.strictEqual(files[0].isDirectory(), true);
    }

    pipeline([vfs.src(inputDirGlob), concatArray(assertion)], done);
  });

  it("globs a directory with default settings and relative cwd", function (t, done) {
    var cwd = path.relative(process.cwd(), __dirname);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isNull(), true);
      assert.strictEqual(files[0].isDirectory(), true);
    }

    pipeline(
      [vfs.src("./fixtures/f*/", { cwd: cwd }), concatArray(assertion)],
      done,
    );
  });

  it("streams a directory with default settings", function (t, done) {
    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].path, inputDirpath);
      assert.strictEqual(files[0].isNull(), true);
      assert.strictEqual(files[0].isDirectory(), true);
    }

    pipeline([vfs.src(inputDirpath), concatArray(assertion)], done);
  });

  it("streams file with with no contents using read: false option", function (t, done) {
    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].path, inputPath);
      assert.strictEqual(files[0].isNull(), true);
      assert.strictEqual(files[0].contents, null);
    }

    pipeline(
      [vfs.src(inputPath, { read: false }), concatArray(assertion)],
      done,
    );
  });

  it("streams a file changed after since", function (t, done) {
    var lastUpdateDate = new Date(+fs.statSync(inputPath).mtime - 1000);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].path, inputPath);
    }

    pipeline(
      [vfs.src(inputPath, { since: lastUpdateDate }), concatArray(assertion)],
      done,
    );
  });

  it("does not stream a file changed before since", function (t, done) {
    var lastUpdateDate = new Date(+fs.statSync(inputPath).mtime + 1000);

    function assertion(files) {
      assert.strictEqual(files.length, 0);
    }

    pipeline(
      [vfs.src(inputPath, { since: lastUpdateDate }), concatArray(assertion)],
      done,
    );
  });

  it("streams a file with ctime greater than mtime", function (t, done) {
    fs.mkdirSync(outputBase);
    fs.copyFileSync(inputPath, outputPath);

    var renamedPath = path.join(outputBase, "foo.txt");

    setTimeout(function () {
      // rename changes ctime but not mtime
      fs.renameSync(outputPath, renamedPath);

      var stat = fs.statSync(renamedPath);

      assert.strictEqual(+stat.ctime >= +stat.mtime, true);

      var lastMtime = new Date(+stat.mtime);

      function assertion(files) {
        assert.strictEqual(files.length, 1);
        assert.strictEqual(files[0].path, renamedPath);
      }

      pipeline(
        [vfs.src(renamedPath, { since: lastMtime }), concatArray(assertion)],
        done,
      );
    }, 250);
  });

  it("streams a file with streaming contents", function (t, done) {
    var expectedContent = fs.readFileSync(inputPath);

    function assertContent(contents) {
      assert.deepStrictEqual(contents, expectedContent);
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].path, inputPath);
      assert.strictEqual(files[0].isStream(), true);
    }

    pipeline(
      [
        vfs.src(inputPath, { buffer: false }),
        compareContents(assertContent),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("can be used as a through stream and adds new files to the end", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: fs.readFileSync(inputPath),
      stat: fs.statSync(inputPath),
    });

    function assertion(files) {
      assert.strictEqual(files.length, 2);
      assert.strictEqual(files[0], file);
    }

    pipeline([from([file]), vfs.src(inputPath), concatArray(assertion)], done);
  });

  it("can be used at beginning and in the middle", function (t, done) {
    function assertion(files) {
      assert.strictEqual(files.length, 2);
    }

    pipeline(
      [vfs.src(inputPath), vfs.src(inputPath), concatArray(assertion)],
      done,
    );
  });

  it("does not pass options on to stream", function (t, done) {
    // Reference: https://github.com/gulpjs/vinyl-fs/issues/153
    var read = t.mock.fn(() => false);

    function assertion() {
      // Called once to resolve the option
      assert.strictEqual(read.mock.callCount(), 1);
    }

    pipeline(
      [vfs.src(inputPath, { read: read }), concatArray(assertion)],
      done,
    );
  });
});
