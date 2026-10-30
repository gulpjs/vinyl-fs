"use strict";

var assert = require("node:assert");
var { afterEach, beforeEach, it } = require("node:test");

var fs = require("graceful-fs");

var vfs = require("../");

var cleanup = require("./utils/cleanup");
var testStreams = require("./utils/test-streams");
var testConstants = require("./utils/test-constants");
var describeStreams = require("./utils/suite");

var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var symlinkNestedTarget = testConstants.symlinkNestedTarget;
var symlinkPath = testConstants.symlinkPath;
var symlinkDirpath = testConstants.symlinkDirpath;
var symlinkMultiDirpath = testConstants.symlinkMultiDirpath;
var symlinkMultiDirpathSecond = testConstants.symlinkMultiDirpathSecond;
var symlinkNestedFirst = testConstants.symlinkNestedFirst;
var symlinkNestedSecond = testConstants.symlinkNestedSecond;

var clean = cleanup(outputBase);

describeStreams(".src() with symlinks", function (stream) {
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var concatArray = streamUtils.concatArray;

  beforeEach(clean);
  afterEach(clean);

  beforeEach(function (t, done) {
    fs.mkdirSync(outputBase);
    fs.mkdirSync(outputDirpath);
    fs.symlinkSync(inputDirpath, symlinkDirpath);
    fs.symlinkSync(symlinkDirpath, symlinkMultiDirpath);
    fs.symlinkSync(symlinkMultiDirpath, symlinkMultiDirpathSecond);
    fs.symlinkSync(inputPath, symlinkPath);
    fs.symlinkSync(symlinkNestedTarget, symlinkNestedSecond);
    fs.symlinkSync(symlinkNestedSecond, symlinkNestedFirst);
    done();
  });

  it("resolves symlinks correctly", function (t, done) {
    function assertion(files) {
      assert.strictEqual(files.length, 1);
      // The path should be the symlink itself
      assert.strictEqual(files[0].path, symlinkNestedFirst);
      // But the content should be what's in the actual file
      assert.strictEqual(files[0].contents.toString(), "symlink works\n");
      // And the stats should have been updated
      assert.strictEqual(files[0].stat.isSymbolicLink(), false);
      assert.strictEqual(files[0].stat.isFile(), true);
    }

    pipeline([vfs.src(symlinkNestedFirst), concatArray(assertion)], done);
  });

  it("resolves directory symlinks correctly", function (t, done) {
    function assertion(files) {
      assert.strictEqual(files.length, 1);
      // The path should be the symlink itself
      assert.strictEqual(files[0].path, symlinkDirpath);
      // But the contents should be null
      assert.strictEqual(files[0].contents, null);
      // And the stats should have been updated
      assert.strictEqual(files[0].stat.isSymbolicLink(), false);
      assert.strictEqual(files[0].stat.isDirectory(), true);
    }

    pipeline([vfs.src(symlinkDirpath), concatArray(assertion)], done);
  });

  it("resolves nested symlinks to directories correctly", function (t, done) {
    function assertion(files) {
      assert.strictEqual(files.length, 1);
      // The path should be the symlink itself
      assert.strictEqual(files[0].path, symlinkMultiDirpathSecond);
      // But the contents should be null
      assert.strictEqual(files[0].contents, null);
      // And the stats should have been updated
      assert.strictEqual(files[0].stat.isSymbolicLink(), false);
      assert.strictEqual(files[0].stat.isDirectory(), true);
    }

    pipeline(
      [vfs.src(symlinkMultiDirpathSecond), concatArray(assertion)],
      done,
    );
  });

  it("preserves file symlinks with resolveSymlinks option set to false", function (t, done) {
    var expectedRelativeSymlinkPath = fs.readlinkSync(symlinkPath);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].path, symlinkPath);
      assert.strictEqual(files[0].symlink, expectedRelativeSymlinkPath);
    }

    pipeline(
      [
        vfs.src(symlinkPath, { resolveSymlinks: false }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("preserves directory symlinks with resolveSymlinks option set to false", function (t, done) {
    var expectedRelativeSymlinkPath = fs.readlinkSync(symlinkDirpath);

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].path, symlinkDirpath);
      assert.strictEqual(files[0].symlink, expectedRelativeSymlinkPath);
    }

    pipeline(
      [
        vfs.src(symlinkDirpath, { resolveSymlinks: false }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("receives a file with symbolic link stats when resolveSymlinks is a function", function (t, done) {
    function resolveSymlinks(file) {
      assert.ok(file != null);
      assert.ok(file.stat != null);
      assert.strictEqual(file.stat.isSymbolicLink(), true);

      return true;
    }

    function assertion(files) {
      assert.strictEqual(files.length, 1);
      // And the stats should have been updated
      assert.strictEqual(files[0].stat.isSymbolicLink(), false);
      assert.strictEqual(files[0].stat.isFile(), true);
    }

    pipeline(
      [
        vfs.src(symlinkNestedFirst, { resolveSymlinks: resolveSymlinks }),
        concatArray(assertion),
      ],
      done,
    );
  });

  it("only calls resolveSymlinks once-per-file if it is a function", function (t, done) {
    var spy = t.mock.fn(() => {
      true;
    });

    function assertion() {
      assert.strictEqual(spy.mock.callCount(), 1);
    }

    pipeline(
      [
        vfs.src(symlinkNestedFirst, { resolveSymlinks: spy }),
        concatArray(assertion),
      ],
      done,
    );
  });
});
