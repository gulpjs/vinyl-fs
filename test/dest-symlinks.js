'use strict';

var path = require('path');

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var isWindows = require('./utils/is-windows');
var always = require('./utils/always');
var testStreams = require('./utils/test-streams');
var testConstants = require('./utils/test-constants');
var describeStreams = require('./utils/suite');

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

describeStreams('.dest() with symlinks', function (stream) {
  before(function () {
    if (process.versions.node.startsWith("10.")) {
      this.skip();
      return;
    }
  });

  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var concatArray = streamUtils.concatArray;

  beforeEach(clean);
  afterEach(clean);

  it('creates symlinks when `file.isSymbolic()` is true', function (done) {
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

      expect(files.length).toEqual(1);
      expect(file.symlink).toEqual(symlink);
      expect(files[0].symlink).toEqual(symlink);
      expect(files[0].isSymbolic()).toBe(true);
      expect(files[0].path).toEqual(outputPath);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('does not create symlinks when `file.isSymbolic()` is false', function (done) {
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

      expect(files.length).toEqual(1);
      expect(symlinkExists).toBe(false);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('errors if missing a `.symlink` property', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
      stat: {
        isSymbolicLink: always(true),
      },
    });

    function assert(err) {
      expect(err).toEqual(expect.anything());
      expect(err.message).toEqual('Missing symlink property on symbolic vinyl');
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it('emits Vinyl files that are (still) symbolic', function (done) {
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
      expect(files.length).toEqual(1);
      expect(files[0].isSymbolic()).toEqual(true);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('can create relative links', function (done) {
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

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(path.normalize('../fixtures/test.txt'));
      expect(files[0].isSymbolic()).toBe(true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { relativeSymlinks: true }),
        concatArray(assert),
      ],
      done
    );
  });

  it('(*nix) creates a link for a directory', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

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

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(inputDirpath);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('(windows) creates a junction for a directory', function (done) {
    if (!isWindows) {
      this.skip();
      return;
    }

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

      expect(files.length).toEqual(1);
      // When creating a junction, it seems Windows appends a separator until Node 22+
      if (process.versions.node.startsWith("22.") || process.versions.node.startsWith("24.")) {
        expect(outputLink).toEqual(inputDirpath);
      } else {
        expect(outputLink).toEqual(inputDirpath + path.sep);
      }
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('(windows) options can disable junctions for a directory', function (done) {
    if (!isWindows) {
      this.skip();
      return;
    }

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

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(inputDirpath);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { useJunctions: false }),
        concatArray(assert),
      ],
      done
    );
  });

  it('(windows) options can disable junctions for a directory (as a function)', function (done) {
    if (!isWindows) {
      this.skip();
      return;
    }

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
      expect(f).toEqual(expect.anything());
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

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { useJunctions: useJunctions }),
        concatArray(assert),
      ],
      done
    );
  });

  it('(*nix) can create relative links for directories', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

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

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(path.normalize('../fixtures/foo'));
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { relativeSymlinks: true }),
        concatArray(assert),
      ],
      done
    );
  });

  it('(*nix) receives a virtual symbolic directory and creates a symlink', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

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

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(neInputDirpath);
      expect(linkTargetExists).toEqual(false);
      expect(lstats.isSymbolicLink()).toEqual(true);
    }

    pipeline(
      [
        // This could also be from a different Vinyl adapter
        from([file]),
        vfs.dest(neOutputBase),
        concatArray(assert),
      ],
      done
    );
  });

  // There's no way to determine the proper type of link to create with a dangling link
  // So we just create a 'file' type symlink
  // There's also no real way to test the type that was created
  it('(windows) receives a virtual symbolic directory and creates a symlink', function (done) {
    if (!isWindows) {
      this.skip();
      return;
    }

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

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(neInputDirpath);
      expect(linkTargetExists).toEqual(false);
      expect(lstats.isSymbolicLink()).toEqual(true);
    }

    pipeline(
      [
        // This could also be from a different Vinyl adapter
        from([file]),
        vfs.dest(neOutputBase),
        concatArray(assert),
      ],
      done
    );
  });

  it('(windows) relativeSymlinks option is ignored when junctions are used', function (done) {
    if (!isWindows) {
      this.skip();
      return;
    }

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

      expect(files.length).toEqual(1);
      // When creating a junction, it seems Windows appends a separator until Node 22+
      if (process.versions.node.startsWith("22.") || process.versions.node.startsWith("24.")) {
        expect(outputLink).toEqual(inputDirpath);
      } else {
        expect(outputLink).toEqual(inputDirpath + path.sep);
      }
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
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
      done
    );
  });

  it('(windows) supports relativeSymlinks option when link is not for a directory', function (done) {
    if (!isWindows) {
      this.skip();
      return;
    }

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

      expect(files.length).toEqual(1);
      expect(outputLink).toEqual(path.normalize('../fixtures/test.txt'));
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
      done
    );
  });

  it('(windows) can create relative links for directories when junctions are disabled', function (done) {
    if (!isWindows) {
      this.skip();
      return;
    }

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

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputDirpath, 'path should have changed');
      expect(outputLink).toEqual(path.normalize('../fixtures/foo'));
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
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
      done
    );
  });

  it('does not overwrite links with overwrite option set to false', function (done) {
    var existingContents = 'Lorem Ipsum';

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
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(existingContents);
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
      done
    );
  });

  it('overwrites links with overwrite option set to true', function (done) {
    var existingContents = 'Lorem Ipsum';

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
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(contents);
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
      done
    );
  });

  it('does not overwrite links with overwrite option set to a function that returns false', function (done) {
    var existingContents = 'Lorem Ipsum';

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

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { overwrite: overwrite }),
        concatArray(assert),
      ],
      done
    );
  });

  it('overwrites links with overwrite option set to a function that returns true', function (done) {
    var existingContents = 'Lorem Ipsum';

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

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { overwrite: overwrite }),
        concatArray(assert),
      ],
      done
    );
  });
});
