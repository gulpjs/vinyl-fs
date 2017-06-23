'use strict';

var path = require('path');

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');
var miss = require('mississippi');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var isWindows = require('./utils/is-windows');
var isDirectory = require('./utils/is-directory-mock');
var testConstants = require('./utils/test-constants');

var from = miss.from;
var pipe = miss.pipe;
var concat = miss.concat;

var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

describe('.dest() with symlinks', function() {

  beforeEach(clean);
  afterEach(clean);

  it('creates symlinks when the `symlink` attribute is set on the file', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function assert(files) {
      var symlink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(file.symlink).toEqual(symlink);
      expect(files[0].symlink).toEqual(symlink);
      expect(files[0].path).toEqual(outputPath);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase),
      concat(assert),
    ], done);
  });

  it('can create relative links', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(path.normalize('../fixtures/test.txt'));
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { relative: true }),
      concat(assert),
    ], done);
  });

  it('(*nix) creates a link for a directory', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: isDirectory,
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputDirpath;

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(inputDirpath);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase),
      concat(assert),
    ], done);
  });

  it('(windows) creates a junction for a directory', function(done) {
    if (!isWindows) {
      this.skip();
      return;
    }

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: isDirectory,
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputDirpath;

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      // When creating a junction, it seems Windows appends a separator
      expect(outputLink).toEqual(inputDirpath + path.sep);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase),
      concat(assert),
    ], done);
  });

  it('(windows) options can disable junctions for a directory', function(done) {
    if (!isWindows) {
      this.skip();
      return;
    }

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: isDirectory,
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputDirpath;

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(inputDirpath);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { useJunctions: false }),
      concat(assert),
    ], done);
  });

  it('(windows) options can disable junctions for a directory (as a function)', function(done) {
    if (!isWindows) {
      this.skip();
      return;
    }

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: isDirectory,
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputDirpath;

    function useJunctions(f) {
      expect(f).toExist();
      expect(f).toBe(file);
      return false;
    }

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(inputDirpath);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { useJunctions: useJunctions }),
      concat(assert),
    ], done);
  });

  it('(*nix) can create relative links for directories', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: isDirectory,
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputDirpath;

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(path.normalize('../fixtures/foo'));
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { relative: true }),
      concat(assert),
    ], done);
  });

  it('(windows) relative option is ignored when junctions are used', function(done) {
    if (!isWindows) {
      this.skip();
      return;
    }

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: isDirectory,
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputDirpath;

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      // When creating a junction, it seems Windows appends a separator
      expect(outputLink).toEqual(inputDirpath + path.sep);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { useJunctions: true, relative: true }),
      concat(assert),
    ], done);
  });

  it('(windows) can create relative links for directories when junctions are disabled', function(done) {
    if (!isWindows) {
      this.skip();
      return;
    }

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: isDirectory,
      },
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputDirpath;

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputDirpath, 'path should have changed');
      expect(outputLink).toEqual(path.normalize('../fixtures/foo'));
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { useJunctions: false, relative: true }),
      concat(assert),
    ], done);
  });

  it('does not overwrite links with overwrite option set to false', function(done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(existingContents);
    }

    // Write expected file which should not be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { overwrite: false }),
      concat(assert),
    ], done);
  });


  it('overwrites links with overwrite option set to true', function(done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { overwrite: true }),
      concat(assert),
    ], done);
  });

  it('does not overwrite links with overwrite option set to a function that returns false', function(done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function overwrite(f) {
      expect(f).toEqual(file);
      return false;
    }

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(existingContents);
    }

    // Write expected file which should not be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { overwrite: overwrite }),
      concat(assert),
    ], done);
  });

  it('overwrites links with overwrite option set to a function that returns true', function(done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    // `src()` adds this side-effect with `resolveSymlinks` option set to false
    file.symlink = inputPath;

    function overwrite(f) {
      expect(f).toEqual(file);
      return true;
    }

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipe([
      from.obj([file]),
      vfs.dest(outputBase, { overwrite: overwrite }),
      concat(assert),
    ], done);
  });
});
