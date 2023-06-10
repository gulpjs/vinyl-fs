'use strict';

var fs = require('graceful-fs');
var expect = require('expect');
var sinon = require('sinon');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var testStreams = require('./utils/test-streams');
var testConstants = require('./utils/test-constants');
var describeStreams = require('./utils/suite');

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

describeStreams('.src() with symlinks', function (stream) {
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var concatArray = streamUtils.concatArray;

  beforeEach(clean);
  afterEach(clean);

  beforeEach(function (done) {
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

  it('resolves symlinks correctly', function (done) {
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

    pipeline([vfs.src(symlinkNestedFirst), concatArray(assert)], done);
  });

  it('resolves directory symlinks correctly', function (done) {
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

    pipeline([vfs.src(symlinkDirpath), concatArray(assert)], done);
  });

  it('resolves nested symlinks to directories correctly', function (done) {
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

    pipeline([vfs.src(symlinkMultiDirpathSecond), concatArray(assert)], done);
  });

  it('preserves file symlinks with resolveSymlinks option set to false', function (done) {
    var expectedRelativeSymlinkPath = fs.readlinkSync(symlinkPath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(symlinkPath);
      expect(files[0].symlink).toEqual(expectedRelativeSymlinkPath);
    }

    pipeline(
      [vfs.src(symlinkPath, { resolveSymlinks: false }), concatArray(assert)],
      done
    );
  });

  it('preserves directory symlinks with resolveSymlinks option set to false', function (done) {
    var expectedRelativeSymlinkPath = fs.readlinkSync(symlinkDirpath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(symlinkDirpath);
      expect(files[0].symlink).toEqual(expectedRelativeSymlinkPath);
    }

    pipeline(
      [
        vfs.src(symlinkDirpath, { resolveSymlinks: false }),
        concatArray(assert),
      ],
      done
    );
  });

  it('receives a file with symbolic link stats when resolveSymlinks is a function', function (done) {
    function resolveSymlinks(file) {
      expect(file).toEqual(expect.anything());
      expect(file.stat).toEqual(expect.anything());
      expect(file.stat.isSymbolicLink()).toEqual(true);

      return true;
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      // And the stats should have been updated
      expect(files[0].stat.isSymbolicLink()).toEqual(false);
      expect(files[0].stat.isFile()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(symlinkNestedFirst, { resolveSymlinks: resolveSymlinks }),
        concatArray(assert),
      ],
      done
    );
  });

  it('only calls resolveSymlinks once-per-file if it is a function', function (done) {
    var spy = sinon.fake.returns(true);

    function assert() {
      expect(spy.callCount).toEqual(1);
    }

    pipeline(
      [
        vfs.src(symlinkNestedFirst, { resolveSymlinks: spy }),
        concatArray(assert),
      ],
      done
    );
  });
});
