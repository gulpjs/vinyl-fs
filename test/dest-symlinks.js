"use strict";

var path = require("node:path");
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

var skipPosix = { skip: !isWindows };
var skipWin = { skip: isWindows };

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

describeStreams(".dest() with symlinks", (stream) => {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var concatArray = streamUtils.concatArray;

  beforeEach(clean);
  afterEach(clean);

  it("creates symlinks when `file.isSymbolic()` is true", (t, done) => {
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

  it("does not create symlinks when `file.isSymbolic()` is false", (t, done) => {
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

  it("errors if missing a `.symlink` property", (t, done) => {
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

  it("emits Vinyl files that are (still) symbolic", (t, done) => {
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
      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files[0].isSymbolic(), true);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("can create relative links", (t, done) => {
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
      var outputLink = fs.readlinkSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputLink, path.normalize("../fixtures/test.txt"));
      t.assert.strictEqual(files[0].isSymbolic(), true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { relativeSymlinks: true }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(nix) creates a link for a directory", skipWin, (t, done) => {
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

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputLink, inputDirpath);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("(win) creates a junction for a directory", skipPosix, (t, done) => {
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

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
      t.assert.strictEqual(outputLink, inputDirpath);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it("(win) can disable junctions for directory", skipPosix, (t, done) => {
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

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputLink, inputDirpath);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { useJunctions: false }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(win) func disable junctions for directory", skipPosix, (t, done) => {
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
      t.assert.ok(f != null);
      t.assert.strictEqual(f, file);
      return false;
    }

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputLink, inputDirpath);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { useJunctions: useJunctions }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(nix) creates relative links for directories", skipWin, (t, done) => {
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

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputLink, path.normalize("../fixtures/foo"));
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { relativeSymlinks: true }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(nix) symlink from virtual symbolic dir", skipWin, (t, done) => {
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

    function assert(files) {
      var lstats = fs.lstatSync(neOutputDirpath);
      var outputLink = fs.readlinkSync(neOutputDirpath);
      var linkTargetExists = fs.existsSync(outputLink);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputLink, neInputDirpath);
      t.assert.strictEqual(linkTargetExists, false);
      t.assert.strictEqual(lstats.isSymbolicLink(), true);
    }

    pipeline(
      [
        // This could also be from a different Vinyl adapter
        from([file]),
        vfs.dest(neOutputBase),
        concatArray(assert),
      ],
      done,
    );
  });

  // There's no way to determine the proper type of link to create with a dangling link
  // So we just create a 'file' type symlink
  // There's also no real way to test the type that was created
  it("(win) symlink from virtual symbolic dir", skipPosix, (t, done) => {
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

    function assert(files) {
      var lstats = fs.lstatSync(neOutputDirpath);
      var outputLink = fs.readlinkSync(neOutputDirpath);
      var linkTargetExists = fs.existsSync(outputLink);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputLink, neInputDirpath);
      t.assert.strictEqual(linkTargetExists, false);
      t.assert.strictEqual(lstats.isSymbolicLink(), true);
    }

    pipeline(
      [
        // This could also be from a different Vinyl adapter
        from([file]),
        vfs.dest(neOutputBase),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(win) relativeSymlinks ignored when junctions", skipPosix, (t, done) => {
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

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      // When creating a junction, it seems Windows no longer appends a separator as of Node 22+
      t.assert.strictEqual(outputLink, inputDirpath);
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, {
          useJunctions: true,
          relativeSymlinks: true,
        }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("(win) relativeSymlinks when link not a dir", skipPosix, (t, done) => {
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
      var outputLink = fs.readlinkSync(outputPath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(outputLink, path.normalize("../fixtures/test.txt"));
    }

    pipeline(
      [
        from([file]),
        // The useJunctions option is ignored when file is not a directory
        vfs.dest(outputBase, {
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
        isSymbolicLink: always(true),
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputDirpath;

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      t.assert.strictEqual(files.length, 1);
      t.assert.strictEqual(files.includes(file), true);
      t.assert.strictEqual(
        files[0].base,
        outputBase,
        "base should have changed",
      );
      t.assert.strictEqual(
        files[0].path,
        outputDirpath,
        "path should have changed",
      );
      t.assert.strictEqual(outputLink, path.normalize("../fixtures/foo"));
      t.assert.strictEqual(stats.isDirectory(), true);
      t.assert.strictEqual(lstats.isDirectory(), false);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, {
          useJunctions: false,
          relativeSymlinks: true,
        }),
        concatArray(assert),
      ],
      done,
    );
  });

  it("does not overwrite links with overwrite option set to false", (t, done) => {
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

  it("overwrites links with overwrite option set to true", (t, done) => {
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

  it("does not overwrite links with overwrite option set to a function that returns false", (t, done) => {
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

  it("overwrites links with overwrite option set to a function that returns true", (t, done) => {
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
});
