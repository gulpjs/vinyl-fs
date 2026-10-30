"use strict";

var path = require("node:path");
var assert = require("node:assert");
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

  it("throws on no folder argument", function () {
    function noFolder() {
      vfs.symlink();
    }

    assert.throws(noFolder, {
      message:
        "Invalid symlink() folder argument. Please specify a non-empty string or a function.",
    });
  });

  it("throws on empty string folder argument", function () {
    function emptyFolder() {
      vfs.symlink("");
    }

    assert.throws(emptyFolder, {
      message:
        "Invalid symlink() folder argument. Please specify a non-empty string or a function.",
    });
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
        vfs.symlink(outputRelative, { cwd: __dirname }),
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
      [from([file]), vfs.symlink(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("creates a link to the right folder with relative cwd", function (t, done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assertion(files) {
      var outputLink = fs.readlinkSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(files[0].symlink, outputLink);
      assert.strictEqual(files[0].isSymbolic(), true);
      assert.strictEqual(outputLink, inputPath);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputRelative, { cwd: cwd }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("creates a link to the right folder with function and relative cwd", function (t, done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function outputFn(f) {
      assert.strictEqual(f, file);
      return outputRelative;
    }

    function assertion(files) {
      var outputLink = fs.readlinkSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(files[0].symlink, outputLink);
      assert.strictEqual(files[0].isSymbolic(), true);
      assert.strictEqual(outputLink, inputPath);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputFn, { cwd: cwd }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("creates a link for a file with buffered contents", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assertion(files) {
      var outputLink = fs.readlinkSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(files[0].symlink, outputLink);
      assert.strictEqual(files[0].isSymbolic(), true);
      assert.strictEqual(outputLink, inputPath);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("can create relative links", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assertion(files) {
      var outputLink = fs.readlinkSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(files[0].symlink, outputLink);
      assert.strictEqual(files[0].isSymbolic(), true);
      assert.strictEqual(outputLink, path.normalize("../fixtures/test.txt"));
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { relativeSymlinks: true }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("will create symlinks with different names if property set in pipeline", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    var renamed = "renamed-symlink.txt";

    function assertion(files) {
      var outputLink = fs.readlinkSync(path.join(outputBase, renamed));

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, path.join(outputBase, renamed));
      assert.strictEqual(files[0].symlink, outputLink);
      assert.strictEqual(files[0].isSymbolic(), true);
      assert.strictEqual(outputLink, inputPath);
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
        concatArray(assertion),
      ],
      done,
    );
  });

  it("creates a link for a file with streaming contents", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assertion(files) {
      var outputLink = fs.readlinkSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files.includes(file), true);
      assert.strictEqual(files[0].base, outputBase);
      assert.strictEqual(files[0].path, outputPath);
      assert.strictEqual(files[0].symlink, outputLink);
      assert.strictEqual(files[0].isSymbolic(), true);
      assert.strictEqual(outputLink, inputPath);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("emits Vinyl objects that are symbolic", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isSymbolic(), true);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assertion)],
      done,
    );
  });

  it(
    "(*nix) creates a link for a directory",
    { skip: isWindows },
    function (t, done) {
      var file = new File({
        base: inputBase,
        path: inputDirpath,
        contents: null,
        stat: {
          isDirectory: always(true),
        },
      });

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(files.includes(file), true);
        assert.strictEqual(files[0].base, outputBase);
        assert.strictEqual(files[0].path, outputDirpath);
        assert.strictEqual(files[0].symlink, outputLink);
        assert.strictEqual(outputLink, inputDirpath);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [from([file]), vfs.symlink(outputBase), concatArray(assertion)],
        done,
      );
    },
  );

  it(
    "(windows) creates a junction for a directory",
    { skip: !isWindows },
    function (t, done) {
      var file = new File({
        base: inputBase,
        path: inputDirpath,
        contents: null,
        stat: {
          isDirectory: always(true),
        },
      });

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(files.includes(file), true);
        assert.strictEqual(files[0].base, outputBase);
        assert.strictEqual(files[0].path, outputDirpath);
        // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
        assert.strictEqual(files[0].symlink, outputLink);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [from([file]), vfs.symlink(outputBase), concatArray(assertion)],
        done,
      );
    },
  );

  it(
    "(windows) options can disable junctions for a directory",
    { skip: !isWindows },
    function (t, done) {
      var file = new File({
        base: inputBase,
        path: inputDirpath,
        contents: null,
        stat: {
          isDirectory: always(true),
        },
      });

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(files.includes(file), true);
        assert.strictEqual(files[0].base, outputBase);
        assert.strictEqual(files[0].path, outputDirpath);
        assert.strictEqual(files[0].symlink, outputLink);
        assert.strictEqual(outputLink, inputDirpath);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.symlink(outputBase, { useJunctions: false }),
          concatArray(assertion),
        ],
        done,
      );
    },
  );

  it(
    "(windows) options can disable junctions for a directory (as a function)",
    { skip: !isWindows },
    function (t, done) {
      var file = new File({
        base: inputBase,
        path: inputDirpath,
        contents: null,
        stat: {
          isDirectory: always(true),
        },
      });

      function useJunctions(f) {
        assert.strictEqual(f, file);
        return false;
      }

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(files.includes(file), true);
        assert.strictEqual(files[0].base, outputBase);
        assert.strictEqual(files[0].path, outputDirpath);
        assert.strictEqual(files[0].symlink, outputLink);
        assert.strictEqual(outputLink, inputDirpath);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.symlink(outputBase, { useJunctions: useJunctions }),
          concatArray(assertion),
        ],
        done,
      );
    },
  );

  it(
    "(*nix) can create relative links for directories",
    { skip: isWindows },
    function (t, done) {
      var file = new File({
        base: inputBase,
        path: inputDirpath,
        contents: null,
        stat: {
          isDirectory: always(true),
        },
      });

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(files.includes(file), true);
        assert.strictEqual(files[0].base, outputBase);
        assert.strictEqual(files[0].path, outputDirpath);
        assert.strictEqual(files[0].symlink, outputLink);
        assert.strictEqual(outputLink, path.normalize("../fixtures/foo"));
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.symlink(outputBase, { relativeSymlinks: true }),
          concatArray(assertion),
        ],
        done,
      );
    },
  );

  it(
    "(windows) relativeSymlinks option is ignored when junctions are used",
    { skip: !isWindows },
    function (t, done) {
      var file = new File({
        base: inputBase,
        path: inputDirpath,
        contents: null,
        stat: {
          isDirectory: always(true),
        },
      });

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(files.includes(file), true);
        assert.strictEqual(files[0].base, outputBase);
        assert.strictEqual(files[0].path, outputDirpath);
        // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
        assert.strictEqual(files[0].symlink, outputLink);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.symlink(outputBase, {
            useJunctions: true,
            relativeSymlinks: true,
          }),
          concatArray(assertion),
        ],
        done,
      );
    },
  );

  it(
    "(windows) supports relativeSymlinks option when link is not for a directory",
    { skip: !isWindows },
    function (t, done) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: null,
      });

      function assertion(files) {
        var outputLink = fs.readlinkSync(outputPath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(files.includes(file), true);
        assert.strictEqual(files[0].base, outputBase);
        assert.strictEqual(files[0].path, outputPath);
        assert.strictEqual(outputLink, path.normalize("../fixtures/test.txt"));
      }

      pipeline(
        [
          from([file]),
          // The useJunctions option is ignored when file is not a directory
          vfs.symlink(outputBase, {
            useJunctions: true,
            relativeSymlinks: true,
          }),
          concatArray(assertion),
        ],
        done,
      );
    },
  );

  it(
    "(windows) can create relative links for directories when junctions are disabled",
    { skip: !isWindows },
    function (t, done) {
      var file = new File({
        base: inputBase,
        path: inputDirpath,
        contents: null,
        stat: {
          isDirectory: always(true),
        },
      });

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(files.includes(file), true);
        assert.strictEqual(files[0].base, outputBase);
        assert.strictEqual(files[0].path, outputDirpath);
        assert.strictEqual(files[0].symlink, outputLink);
        assert.strictEqual(outputLink, path.normalize("../fixtures/foo"));
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.symlink(outputBase, {
            useJunctions: false,
            relativeSymlinks: true,
          }),
          concatArray(assertion),
        ],
        done,
      );
    },
  );

  it("reports IO errors", { skip: isWindows }, function (t, done) {
    // Changing the mode of a file is not supported by node.js in Windows.
    // This test is skipped on Windows because we have to chmod the file to 0.
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    fs.mkdirSync(outputBase);
    fs.chmodSync(outputBase, 0);

    function assertion(err) {
      assert.strictEqual(err.code, "EACCES");
      done();
    }

    pipeline([from([file]), vfs.symlink(outputDirpath)], assertion);
  });

  it("does not overwrite links with overwrite option set to false", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
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
        vfs.symlink(outputBase, { overwrite: false }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("overwrites links with overwrite option set to true", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
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
        vfs.symlink(outputBase, { overwrite: true }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("does not overwrite links with overwrite option set to a function that returns false", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
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
        vfs.symlink(outputBase, { overwrite: overwrite }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("overwrites links with overwrite option set to a function that returns true", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
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
        vfs.symlink(outputBase, { overwrite: overwrite }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("emits an end event", function (t, done) {
    var symlinkStream = vfs.symlink(outputBase);

    var ended = false;
    function assertion(err) {
      assert.strictEqual(ended, true);
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

    pipeline([from([file]), symlinkStream], assertion);
  });

  it("emits a finish event", function (t, done) {
    var symlinkStream = vfs.symlink(outputBase);

    var finished = false;
    symlinkStream.on("finish", function () {
      finished = true;
    });

    function assertion(err) {
      assert.ok(finished);
      done(err);
    }

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    pipeline([from([file]), symlinkStream], assertion);
  });

  it("errors when a non-Vinyl object is emitted", function (t, done) {
    var file = {};

    function assertion(err) {
      assert.ok(err != null);
      assert.strictEqual(
        err.message,
        "Received a non-Vinyl object in `symlink()`",
      );
      done();
    }

    pipeline([from([file]), vfs.symlink(outputBase)], assertion);
  });

  it("errors when a buffer-mode stream is piped to it", function (t, done) {
    var file = Buffer.from("test");

    function assertion(err) {
      assert.ok(err != null);
      assert.strictEqual(
        err.message,
        "Received a non-Vinyl object in `symlink()`",
      );
      done();
    }

    pipeline([from([file]), vfs.symlink(outputBase)], assertion);
  });

  it("does not get clogged by highWaterMark", function (t, done) {
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

  it("allows backpressure when piped to another, slower stream", function (t, done) {
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

  it("respects readable listeners on symlink stream", function (t, done) {
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

    function assertion(err) {
      assert.strictEqual(readables, 1);
      done(err);
    }

    pipeline([from([file]), symlinkStream], assertion);
  });

  it("respects data listeners on symlink stream", function (t, done) {
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

    function assertion(err) {
      assert.strictEqual(datas, 1);
      done(err);
    }

    pipeline([from([file]), symlinkStream], assertion);
  });

  it("sinks the stream if all the readable event handlers are removed", function (t, done) {
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

  it("sinks the stream if all the data event handlers are removed", function (t, done) {
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
        vfs.symlink(outputBase, { read: read }),
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
      // Avoid comparing stats because they get reflected
      assert.strictEqual(files[0], file);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("marshalls a Vinyl object without isSymbolic to a newer Vinyl", function (t, done) {
    var file = new File({
      base: outputBase,
      path: outputPath,
      // Pre-set this because it is set by symlink
      symlink: outputPath,
    });

    breakPrototype(file);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      // Avoid comparing stats because they get reflected
      files[0].stat = file.stat;
      assert.partialDeepStrictEqual(files[0], file);
      assert.notStrictEqual(files[0], file);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assertion)],
      done,
    );
  });
});
