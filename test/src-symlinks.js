'use strict';

var fs = require('graceful-fs');
var expect = require('expect');
var miss = require('mississippi');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var testConstants = require('./utils/test-constants');
var testStreams = require('./utils/test-streams');

var join = testStreams.join;
var reportWarningAndSkip = testStreams.reportWarningAndSkip;

var pipe = miss.pipe;

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

describe('.src() with symlinks', function() {

  beforeEach(clean);
  afterEach(clean);

  beforeEach(function(done) {
    try {
      fs.mkdirSync(outputBase);
      fs.mkdirSync(outputDirpath);
      fs.symlinkSync(inputDirpath, symlinkDirpath);
      fs.symlinkSync(symlinkDirpath, symlinkMultiDirpath);
      fs.symlinkSync(symlinkMultiDirpath, symlinkMultiDirpathSecond);
      fs.symlinkSync(inputPath, symlinkPath);
      fs.symlinkSync(symlinkNestedTarget, symlinkNestedSecond);
      fs.symlinkSync(symlinkNestedSecond, symlinkNestedFirst);
    } catch (ex) {
      if (!reportWarningAndSkip(this, ex)) {
        throw ex;
      }
    }
    done();
  });

  it('resolves symlinks correctly', function(done) {
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
      join(assert),
    ], done);
  });

  it('resolves directory symlinks correctly', function(done) {
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
      join(assert),
    ], done);
  });

  it('resolves nested symlinks to directories correctly', function(done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      // The path should be the symlink itself
      expect(files[0].path).toEqual(symlinkMultiDirpathSecond);
      // But the contents should be null
      expect(files[0].contents).toEqual(null);
      // And the stats should have been updated
      expect(files[0].stat.isSymbolicLink()).toEqual(false);
      expect(files[0].stat.isDirectory()).toEqual(true);
    }

    pipe([
      vfs.src(symlinkMultiDirpathSecond),
      join(assert),
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
      join(assert),
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
      join(assert),
    ], done);
  });

  it('recieves a file with symbolic link stats when resolveSymlinks is a function', function(done) {

    function resolveSymlinks(file) {
      expect(file).toExist();
      expect(file.stat).toExist();
      expect(file.stat.isSymbolicLink()).toEqual(true);

      return true;
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      // And the stats should have been updated
      expect(files[0].stat.isSymbolicLink()).toEqual(false);
      expect(files[0].stat.isFile()).toEqual(true);
    }

    pipe([
      vfs.src(symlinkNestedFirst, { resolveSymlinks: resolveSymlinks }),
      join(assert),
    ], done);
  });

  it('only calls resolveSymlinks once-per-file if it is a function', function(done) {

    var spy = expect.createSpy().andReturn(true);

    function assert() {
      expect(spy.calls.length).toEqual(1);
    }

    pipe([
      vfs.src(symlinkNestedFirst, { resolveSymlinks: spy }),
      join(assert),
    ], done);
  });
});
