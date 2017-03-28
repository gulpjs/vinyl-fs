'use strict';

var fs = require('graceful-fs');
var expect = require('expect');
var miss = require('mississippi');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var testConstants = require('./utils/test-constants');

var pipe = miss.pipe;
var concat = miss.concat;

var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var symlinkNestedTarget = testConstants.symlinkNestedTarget;
var symlinkPath = testConstants.symlinkPath;
var symlinkDirpath = testConstants.symlinkDirpath;
var symlinkNestedFirst = testConstants.symlinkNestedFirst;
var symlinkNestedSecond = testConstants.symlinkNestedSecond;

var clean = cleanup([outputBase]);

describe('.src() with symlinks', function() {

  beforeEach(clean);
  afterEach(clean);

  beforeEach(function(done) {
    fs.mkdirSync(outputBase);
    fs.mkdirSync(outputDirpath);
    fs.symlinkSync(inputDirpath, symlinkDirpath);
    fs.symlinkSync(inputPath, symlinkPath);
    fs.symlinkSync(symlinkNestedTarget, symlinkNestedSecond);
    fs.symlinkSync(symlinkNestedSecond, symlinkNestedFirst);
    done();
  });

  it('follows symlinks correctly', function(done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      // The path should be the symlink itself
      expect(files[0].path).toEqual(symlinkNestedFirst);
      // But the content should be what's in the actual file
      expect(files[0].contents.toString()).toEqual('symlink works\n');
      // And the stats should have been updated
      expect(files[0].stat.isSymbolicLink()).toEqual(false);
      expect(files[0].stat.isFile()).toEqual(true);
    }

    pipe([
      vfs.src(symlinkNestedFirst),
      concat(assert),
    ], done);
  });

  it('follows directory symlinks correctly', function(done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      // The path should be the symlink itself
      expect(files[0].path).toEqual(symlinkDirpath);
      // But the contents should be null
      expect(files[0].contents).toEqual(null);
      // And the stats should have been updated
      expect(files[0].stat.isSymbolicLink()).toEqual(false);
      expect(files[0].stat.isDirectory()).toEqual(true);
    }

    pipe([
      vfs.src(symlinkDirpath),
      concat(assert),
    ], done);
  });

  it('preserves file symlinks with resolveSymlinks option set to false', function(done) {
    var expectedRelativeSymlinkPath = fs.readlinkSync(symlinkPath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(symlinkPath);
      expect(files[0].symlink).toEqual(expectedRelativeSymlinkPath);
    }

    pipe([
      vfs.src(symlinkPath, { resolveSymlinks: false }),
      concat(assert),
    ], done);
  });

  it('preserves directory symlinks with resolveSymlinks option set to false', function(done) {
    var expectedRelativeSymlinkPath = fs.readlinkSync(symlinkDirpath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(symlinkDirpath);
      expect(files[0].symlink).toEqual(expectedRelativeSymlinkPath);
    }

    pipe([
      vfs.src(symlinkDirpath, { resolveSymlinks: false }),
      concat(assert),
    ], done);
  });
});
