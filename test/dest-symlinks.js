"use strict";

var path = require("node:path");
var assert = require("node:assert");
var { afterEach, beforeEach, it } = require("node:test");

var fs = require("graceful-fs");
var File = require("vinyl");

var vfs = require("../");

var cleanup = require("./utils/cleanup");
var isWindows = require("./utils/is-windows");
var always = require("./utils/always");
var testStreams = require("./utils/test-streams");
var testConstants = require("./utils/test-constants");
var describeStreams = require("./utils/suite");

var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var contents = testConstants.contents;
// For not-exists tests
var neInputBase = testConstants.neInputBase;
var neOutputBase = testConstants.neOutputBase;
var neInputDirpath = testConstants.neInputDirpath;
var neOutputDirpath = testConstants.neOutputDirpath;

var clean = cleanup(outputBase);

describeStreams(".dest() with symlinks", function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var concatArray = streamUtils.concatArray;

  beforeEach(clean);
  afterEach(clean);

  it("creates symlinks when `file.isSymbolic()` is true", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(true),
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function assert(files) {
      var symlink = fs.readlinkSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(file.symlink, symlink);
      t.assert.strictEqual(files[0].symlink, symlink);
      t.assert.strictEqual(files[0].isSymbolic(), true);
      t.assert.strictEqual(files[0].path, outputPath);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("does not create symlinks when `file.isSymbolic()` is false", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(false),
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function assert(files) {
      var symlinkExists = fs.existsSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(symlinkExists, false);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("errors if missing a `.symlink` property", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(true),
      },
    });

    function assert(err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(
        err.message,
        "Missing symlink property on symbolic vinyl",
      );
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it("emits Vinyl files that are (still) symbolic", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(true),
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].isSymbolic(), true);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase), concatArray(assertion)],
      done,
    );
  });

  it("can create relative links", function (t, done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(true),
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function assertion(files) {
      var outputLink = fs.readlinkSync(outputPath);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(outputLink, path.normalize("../fixtures/test.txt"));
      assert.strictEqual(files[0].isSymbolic(), true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { relativeSymlinks: true }),
        concatArray(assertion),
      ],
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
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = inputDirpath;

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(outputLink, inputDirpath);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [from([file]), vfs.dest(outputBase), concatArray(assertion)],
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
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = inputDirpath;

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
        assert.strictEqual(outputLink, inputDirpath);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [from([file]), vfs.dest(outputBase), concatArray(assertion)],
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
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = inputDirpath;

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(outputLink, inputDirpath);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.dest(outputBase, { useJunctions: false }),
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
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = inputDirpath;

      function useJunctions(f) {
        assert.ok(f != null);
        assert.strictEqual(f, file);
        return false;
      }

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(outputLink, inputDirpath);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.dest(outputBase, { useJunctions: useJunctions }),
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
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = inputDirpath;

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(outputLink, path.normalize("../fixtures/foo"));
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.dest(outputBase, { relativeSymlinks: true }),
          concatArray(assertion),
        ],
        done,
      );
    },
  );

  it(
    "(*nix) receives a virtual symbolic directory and creates a symlink",
    { skip: isWindows },
    function (t, done) {
      var file = new File({
        base: neInputBase,
        path: neInputDirpath,
        contents: null,
        stat: {
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = neInputDirpath;

      function assertion(files) {
        var lstats = fs.lstatSync(neOutputDirpath);
        var outputLink = fs.readlinkSync(neOutputDirpath);
        var linkTargetExists = fs.existsSync(outputLink);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(outputLink, neInputDirpath);
        assert.strictEqual(linkTargetExists, false);
        assert.strictEqual(lstats.isSymbolicLink(), true);
      }

      pipeline(
        [
          // This could also be from a different Vinyl adapter
          from([file]),
          vfs.dest(neOutputBase),
          concatArray(assertion),
        ],
        done,
      );
    },
  );

  // There's no way to determine the proper type of link to create with a dangling link
  // So we just create a 'file' type symlink
  // There's also no real way to test the type that was created
  it(
    "(windows) receives a virtual symbolic directory and creates a symlink",
    { skip: !isWindows },
    function (t, done) {
      var file = new File({
        base: neInputBase,
        path: neInputDirpath,
        contents: null,
        stat: {
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = neInputDirpath;

      function assertion(files) {
        var lstats = fs.lstatSync(neOutputDirpath);
        var outputLink = fs.readlinkSync(neOutputDirpath);
        var linkTargetExists = fs.existsSync(outputLink);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(outputLink, neInputDirpath);
        assert.strictEqual(linkTargetExists, false);
        assert.strictEqual(lstats.isSymbolicLink(), true);
      }

      pipeline(
        [
          // This could also be from a different Vinyl adapter
          from([file]),
          vfs.dest(neOutputBase),
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
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = inputDirpath;

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
        assert.strictEqual(outputLink, inputDirpath);
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.dest(outputBase, {
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
        stat: {
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = inputPath;

      function assertion(files) {
        var outputLink = fs.readlinkSync(outputPath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(outputLink, path.normalize("../fixtures/test.txt"));
      }

      pipeline(
        [
          from([file]),
          // The useJunctions option is ignored when file is not a directory
          vfs.dest(outputBase, {
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
          isSymbolicLink: always(true),
        },
      });

      // `src()` adds this side-effect with `resolveSymlinks` option set to false
      file.symlink = inputDirpath;

      function assertion(files) {
        var stats = fs.statSync(outputDirpath);
        var lstats = fs.lstatSync(outputDirpath);
        var outputLink = fs.readlinkSync(outputDirpath);

        assert.strictEqual(files.length, 1);
        assert.strictEqual(files.includes(file), true);
        assert.strictEqual(
          files[0].base,
          outputBase,
          "base should have changed",
        );
        assert.strictEqual(
          files[0].path,
          outputDirpath,
          "path should have changed",
        );
        assert.strictEqual(outputLink, path.normalize("../fixtures/foo"));
        assert.strictEqual(stats.isDirectory(), true);
        assert.strictEqual(lstats.isDirectory(), false);
      }

      pipeline(
        [
          from([file]),
          vfs.dest(outputBase, {
            useJunctions: false,
            relativeSymlinks: true,
          }),
          concatArray(assertion),
        ],
        done,
      );
    },
  );

  it("does not overwrite links with overwrite option set to false", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(true),
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

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

  it("overwrites links with overwrite option set to true", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(true),
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

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

  it("does not overwrite links with overwrite option set to a function that returns false", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(true),
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

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

  it("overwrites links with overwrite option set to a function that returns true", function (t, done) {
    var existingContents = "Lorem Ipsum";

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(true),
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

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
});
