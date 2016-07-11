'use strict';

var path = require('path');

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');
var miss = require('mississippi');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var statMode = require('./utils/stat-mode');
var isWindows = require('./utils/is-windows');
var applyUmask = require('./utils/apply-umask');
var isDirectory = require('./utils/is-directory-mock');
var testConstants = require('./utils/test-constants');

var from = miss.from;
var pipe = miss.pipe;
var concat = miss.concat;

var outputRelative = testConstants.outputRelative;
var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var contents = testConstants.contents;

var clean = cleanup([outputBase]);

describe('symlink stream', function() {

  beforeEach(clean);
  afterEach(clean);

  // TODO: make this work correctly
  it.skip('throws on invalid folder', function(done) {
    var stream;
    try {
      stream = vfs.symlink();
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      done();
    }
  });

  it('passes through writes with cwd', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputRelative, { cwd: __dirname }),
      concat(assert),
    ], done);
  });

  it('passes through writes with default cwd', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(process.cwd(), 'cwd should not have changed');
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputBase),
      concat(assert),
    ], done);
  });

  it('creates a link to the right folder with relative cwd', function(done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputPath, 'path should have changed');
      expect(outputLink).toEqual(inputPath);
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputRelative, { cwd: cwd }),
      concat(assert),
    ], done);
  });

  it('creates a link to the right folder with function and relative cwd', function(done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function outputFn(f) {
      expect(f).toExist();
      expect(f).toEqual(file);
      return outputRelative;
    }

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputPath, 'path should have changed');
      expect(outputLink).toEqual(inputPath);
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputFn, { cwd: cwd }),
      concat(assert),
    ], done);
  });

  // TODO: test for modes
  it('creates a link for a file with buffered contents', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputPath, 'path should have changed');
      expect(outputLink).toEqual(inputPath);
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputBase),
      concat(assert),
    ], done);
  });

  it('can create relative links', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputPath, 'path should have changed');
      expect(outputLink).toEqual(path.normalize('../fixtures/test.txt'));
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputBase, { relative: true }),
      concat(assert),
    ], done);
  });

  it('creates a link for a file with streaming contents', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputPath, 'path should have changed');
      expect(outputLink).toEqual(inputPath);
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputBase),
      concat(assert),
    ], done);
  });

  it('creates a link for a directory', function(done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: isDirectory,
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputDirpath, 'path should have changed');
      expect(outputLink).toEqual(inputDirpath);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputBase),
      concat(assert),
    ], done);
  });

  it('can create relative links for directories', function(done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: isDirectory,
      },
    });

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
      vfs.symlink(outputBase, { relative: true }),
      concat(assert),
    ], done);
  });

  it('uses different modes for files and directories', function(done) {
    // Changing the mode of a file is not supported by node.js in Windows.
    if (isWindows) {
      this.skip();
      return;
    }

    var dirMode = applyUmask('722');
    var fileMode = applyUmask('700');

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(statMode(outputDirpath)).toEqual(dirMode);
      // TODO: the file doesn't actually get the mode updated
      expect(files[0].stat.mode).toEqual(fileMode);
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputDirpath, { mode: fileMode, dirMode: dirMode }),
      concat(assert),
    ], done);
  });

  it('reports IO errors', function(done) {
    // Changing the mode of a file is not supported by node.js in Windows.
    // This test is skipped on Windows because we have to chmod the file to 0.
    if (isWindows) {
      this.skip();
      return;
    }

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    fs.mkdirSync(outputBase);
    fs.chmodSync(outputBase, 0);

    function assert(err) {
      expect(err.code).toEqual('EACCES');
      done();
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputDirpath),
    ], assert);
  });

  it('emits an end event', function(done) {
    var symlinkStream = vfs.symlink(outputBase);

    symlinkStream.on('end', done);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    pipe([
      from.obj([file]),
      symlinkStream,
    ]);
  });

  it('emits a finish event', function(done) {
    var symlinkStream = vfs.symlink(outputBase);

    symlinkStream.on('finish', done);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    pipe([
      from.obj([file]),
      symlinkStream,
    ]);
  });

  // TODO: need a better way to pass these options through
  // Or maybe not at all since we fixed highWaterMark
  it('passes options to through2', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(err) {
      expect(err.message).toMatch(/Invalid non-string\/buffer chunk/);
      done();
    }

    pipe([
      from.obj([file]),
      vfs.symlink(outputBase, { objectMode: false }),
    ], assert);
  });
});
