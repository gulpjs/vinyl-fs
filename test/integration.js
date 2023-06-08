'use strict';

var path = require('path');

var fs = require('graceful-fs');
var expect = require('expect');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var isWindows = require('./utils/is-windows');
var testStreams = require('./utils/test-streams');
var testConstants = require('./utils/test-constants');

var base = testConstants.outputBase;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var symlinkDirpath = testConstants.symlinkDirpath;
var inputBase = path.join(base, './in/');
var inputGlob = path.join(inputBase, './*.txt');
var outputBase = path.join(base, './out/');
var outputSymlink = path.join(symlinkDirpath, './foo');
var outputDirpathSymlink = path.join(outputDirpath, './foo');
var content = testConstants.contents;

var clean = cleanup(base);

function suite(moduleName) {
  var stream = require(moduleName);

  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var count = streamUtils.count;
  var concatArray = streamUtils.concatArray;

  describe.skip('integrations (using ' + moduleName + ')', function () {
    beforeEach(clean);
    afterEach(clean);

    it('does not exhaust available file descriptors when streaming thousands of files', function (done) {
      // This can be a very slow test on boxes with slow disk i/o
      this.timeout(0);

      // Make a ton of files. Changed from hard links due to Windows failures
      var expectedCount = 6000;

      fs.mkdirSync(base);
      fs.mkdirSync(inputBase);

      for (var idx = 0; idx < expectedCount; idx++) {
        var filepath = path.join(inputBase, './test' + idx + '.txt');
        fs.writeFileSync(filepath, content);
      }

      pipeline(
        [
          vfs.src(inputGlob, { buffer: false }),
          count(expectedCount),
          vfs.dest(outputBase),
        ],
        done
      );
    });

    it('(*nix) sources a directory, creates a symlink and copies it', function (done) {
      if (isWindows) {
        this.skip();
        return;
      }

      function assert(files) {
        var symlinkResult = fs.readlinkSync(outputSymlink);
        var destResult = fs.readlinkSync(outputDirpathSymlink);

        expect(symlinkResult).toEqual(inputDirpath);
        expect(destResult).toEqual(inputDirpath);
        expect(files[0].isSymbolic()).toBe(true);
        expect(files[0].symlink).toEqual(inputDirpath);
      }

      pipeline(
        [
          vfs.src(inputDirpath),
          vfs.symlink(symlinkDirpath),
          vfs.dest(outputDirpath),
          concatArray(assert),
        ],
        done
      );
    });

    it('(windows) sources a directory, creates a junction and copies it', function (done) {
      if (!isWindows) {
        this.skip();
        return;
      }

      function assert(files) {
        // Junctions add an ending separator
        var expected = inputDirpath + path.sep;
        var symlinkResult = fs.readlinkSync(outputSymlink);
        var destResult = fs.readlinkSync(outputDirpathSymlink);

        expect(symlinkResult).toEqual(expected);
        expect(destResult).toEqual(expected);
        expect(files[0].isSymbolic()).toBe(true);
        expect(files[0].symlink).toEqual(inputDirpath);
      }

      pipeline(
        [
          vfs.src(inputDirpath),
          vfs.symlink(symlinkDirpath),
          vfs.dest(outputDirpath),
          concatArray(assert),
        ],
        done
      );
    });

    it('(*nix) sources a symlink and copies it', function (done) {
      if (isWindows) {
        this.skip();
        return;
      }

      fs.mkdirSync(base);
      fs.mkdirSync(symlinkDirpath);
      fs.symlinkSync(inputDirpath, outputSymlink);

      function assert(files) {
        var destResult = fs.readlinkSync(outputDirpathSymlink);

        expect(destResult).toEqual(inputDirpath);
        expect(files[0].isSymbolic()).toEqual(true);
        expect(files[0].symlink).toEqual(inputDirpath);
      }

      pipeline(
        [
          vfs.src(outputSymlink, { resolveSymlinks: false }),
          vfs.dest(outputDirpath),
          concatArray(assert),
        ],
        done
      );
    });

    it('(windows) sources a directory symlink and copies it', function (done) {
      if (!isWindows) {
        this.skip();
        return;
      }

      fs.mkdirSync(base);
      fs.mkdirSync(symlinkDirpath);
      fs.symlinkSync(inputDirpath, outputSymlink, 'dir');

      function assert(files) {
        // 'dir' symlinks add an ending separator
        var expected = inputDirpath + path.sep;
        var destResult = fs.readlinkSync(outputDirpathSymlink);

        expect(destResult).toEqual(expected);
        expect(files[0].isSymbolic()).toEqual(true);
        expect(files[0].symlink).toEqual(inputDirpath);
      }

      pipeline(
        [
          vfs.src(outputSymlink, { resolveSymlinks: false }),
          vfs.dest(outputDirpath),
          concatArray(assert),
        ],
        done
      );
    });

    it('(windows) sources a junction and copies it', function (done) {
      if (!isWindows) {
        this.skip();
        return;
      }

      fs.mkdirSync(base);
      fs.mkdirSync(symlinkDirpath);
      fs.symlinkSync(inputDirpath, outputSymlink, 'junction');

      function assert(files) {
        // Junctions add an ending separator
        var expected = inputDirpath + path.sep;
        var destResult = fs.readlinkSync(outputDirpathSymlink);

        expect(destResult).toEqual(expected);
        expect(files[0].isSymbolic()).toEqual(true);
        expect(files[0].symlink).toEqual(inputDirpath);
      }

      pipeline(
        [
          vfs.src(outputSymlink, { resolveSymlinks: false }),
          vfs.dest(outputDirpath),
          concatArray(assert),
        ],
        done
      );
    });
  });
}

suite('stream');
suite('streamx');
suite('readable-stream');
