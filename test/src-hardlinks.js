'use strict';

var fs = require('graceful-fs');
var expect = require('expect');
var miss = require('mississippi');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var testConstants = require('./utils/test-constants');
var isWin = require('./utils/is-windows');

var pipe = miss.pipe;
var concat = miss.concat;

var outputBase = testConstants.outputBase;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var linkDirpath = testConstants.linkDirpath;
var linkNestedTarget = testConstants.linkNestedTarget;
var linkNestedFirst = testConstants.linkNestedFirst;
var linkNestedSecond = testConstants.linkNestedSecond;

var clean = cleanup([outputBase]);

describe('.src() with hard symlinks', function() {

  beforeEach(clean);
  afterEach(clean);

  beforeEach(function(done) {
    fs.mkdirSync(outputBase);
    fs.mkdirSync(outputDirpath);
    // Directories cannot be hardlinked on any OS, use a softlink instead
    fs.symlinkSync(inputDirpath, linkDirpath, isWin ? 'junction' : 'dir');
    // Hardlink the test file to our 'test' directory file
    fs.linkSync(linkNestedTarget, linkNestedSecond);
    fs.linkSync(linkNestedSecond, linkNestedFirst);
    done();
  });

  it('follows hardlinks correctly', function(done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      // The path should be the link itself
      expect(files[0].path).toEqual(linkNestedFirst);
      // But the content should be what's in the actual file
      expect(files[0].contents.toString()).toEqual('symlink works\n');
      // And the stats should not report it as a symlink
      expect(files[0].stat.isSymbolicLink()).toEqual(false);
      expect(files[0].stat.isFile()).toEqual(true);
    }

    pipe([
      vfs.src(linkNestedFirst),
      concat(assert),
    ], done);
  });

  it('preserves original file contents', function(done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      // Remove both linked files
      fs.unlink(linkNestedFirst);
      fs.unlink(linkNestedSecond);
      // Content should remain when referenced by 'original'.
      expect(files[0].contents.toString()).toEqual('symlink works\n');
    }

    pipe([
      vfs.src(linkNestedTarget),
      concat(assert),
    ], done);
  });

  it('preserves first hardlinked file contents', function(done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      // Remove one hardlinked file
      fs.unlink(linkNestedSecond);
      // Check first hardlinked file
      expect(files[0].contents.toString()).toEqual('symlink works\n');
    }

    pipe([
      vfs.src(linkNestedFirst),
      concat(assert),
    ], done);
  });
});
