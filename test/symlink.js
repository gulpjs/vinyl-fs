'use strict';

var path = require('path');

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var isWindows = require('./utils/is-windows');
var testStreams = require('./utils/test-streams');
var always = require('./utils/always');
var testConstants = require('./utils/test-constants');
var breakPrototype = require('./utils/break-prototype');
var describeStreams = require('./utils/suite');

function noop() {}

var outputRelative = testConstants.outputRelative;
var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

describeStreams('symlink stream', function (stream) {
  before(function () {
    if (process.versions.node.startsWith("10.")) {
      this.skip();
      return;
    }
  });

  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var count = streamUtils.count;
  var slowCount = streamUtils.slowCount;
  var concatArray = streamUtils.concatArray;

  beforeEach(clean);
  afterEach(clean);

  it('throws on no folder argument', function (done) {
    function noFolder() {
      vfs.symlink();
    }

    expect(noFolder).toThrow(
      'Invalid symlink() folder argument. Please specify a non-empty string or a function.'
    );
    done();
  });

  it('throws on empty string folder argument', function (done) {
    function emptyFolder() {
      vfs.symlink('');
    }

    expect(emptyFolder).toThrow(
      'Invalid symlink() folder argument. Please specify a non-empty string or a function.'
    );
    done();
  });

  it('passes through writes with cwd', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].cwd).toEqual(__dirname);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputRelative, { cwd: __dirname }),
        concatArray(assert),
      ],
      done
    );
  });

  it('passes through writes with default cwd', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].cwd).toEqual(process.cwd());
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done
    );
  });

  it('creates a link to the right folder with relative cwd', function (done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(files[0].isSymbolic()).toBe(true);
      expect(outputLink).toEqual(inputPath);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputRelative, { cwd: cwd }),
        concatArray(assert),
      ],
      done
    );
  });

  it('creates a link to the right folder with function and relative cwd', function (done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function outputFn(f) {
      expect(f).toEqual(file);
      return outputRelative;
    }

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(files[0].isSymbolic()).toBe(true);
      expect(outputLink).toEqual(inputPath);
    }

    pipeline(
      [from([file]), vfs.symlink(outputFn, { cwd: cwd }), concatArray(assert)],
      done
    );
  });

  it('creates a link for a file with buffered contents', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(files[0].isSymbolic()).toBe(true);
      expect(outputLink).toEqual(inputPath);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done
    );
  });

  it('can create relative links', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(files[0].isSymbolic()).toBe(true);
      expect(outputLink).toEqual(path.normalize('../fixtures/test.txt'));
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { relativeSymlinks: true }),
        concatArray(assert),
      ],
      done
    );
  });

  it('will create symlinks with different names if property set in pipeline', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    var renamed = 'renamed-symlink.txt';

    function assert(files) {
      var outputLink = fs.readlinkSync(path.join(outputBase, renamed));

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(path.join(outputBase, renamed));
      expect(files[0].symlink).toEqual(outputLink);
      expect(files[0].isSymbolic()).toBe(true);
      expect(outputLink).toEqual(inputPath);
    }

    pipeline(
      [
        from([file]),
        new stream.Transform({
          objectMode: true,
          transform: function (file, enc, cb) {
            if (typeof enc === 'function') {
              cb = enc;
            }

            // User can stash the file.path on the symlink before they rename the file
            file.symlink = file.path;
            // Then they can rename the file
            file.basename = renamed;
            cb(null, file);
          },
        }),
        vfs.symlink(outputBase),
        concatArray(assert),
      ],
      done
    );
  });

  it('creates a link for a file with streaming contents', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(files[0].isSymbolic()).toBe(true);
      expect(outputLink).toEqual(inputPath);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done
    );
  });

  it('emits Vinyl objects that are symbolic', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isSymbolic()).toEqual(true);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
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
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputDirpath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(outputLink).toEqual(inputDirpath);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done
    );
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
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputDirpath);
      // When creating a junction, it seems Windows appends a separator
      expect(files[0].symlink + path.sep).toEqual(outputLink);
      expect(outputLink).toEqual(inputDirpath + path.sep);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done
    );
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
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputDirpath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(outputLink).toEqual(inputDirpath);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { useJunctions: false }),
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
        isDirectory: always(true),
      },
    });

    function useJunctions(f) {
      expect(f).toBe(file);
      return false;
    }

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputDirpath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(outputLink).toEqual(inputDirpath);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { useJunctions: useJunctions }),
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
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputDirpath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(outputLink).toEqual(path.normalize('../fixtures/foo'));
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { relativeSymlinks: true }),
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
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputDirpath);
      // When creating a junction, it seems Windows appends a separator
      expect(files[0].symlink + path.sep).toEqual(outputLink);
      expect(outputLink).toEqual(inputDirpath + path.sep);
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, {
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
    });

    function assert(files) {
      var outputLink = fs.readlinkSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(outputLink).toEqual(path.normalize('../fixtures/test.txt'));
    }

    pipeline(
      [
        from([file]),
        // The useJunctions option is ignored when file is not a directory
        vfs.symlink(outputBase, {
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
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.statSync(outputDirpath);
      var lstats = fs.lstatSync(outputDirpath);
      var outputLink = fs.readlinkSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputDirpath);
      expect(files[0].symlink).toEqual(outputLink);
      expect(outputLink).toEqual(path.normalize('../fixtures/foo'));
      expect(stats.isDirectory()).toEqual(true);
      expect(lstats.isDirectory()).toEqual(false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, {
          useJunctions: false,
          relativeSymlinks: true,
        }),
        concatArray(assert),
      ],
      done
    );
  });

  it('reports IO errors', function (done) {
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

    pipeline([from([file]), vfs.symlink(outputDirpath)], assert);
  });

  it('does not overwrite links with overwrite option set to false', function (done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

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
        vfs.symlink(outputBase, { overwrite: false }),
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
    });

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
        vfs.symlink(outputBase, { overwrite: true }),
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
    });

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
        vfs.symlink(outputBase, { overwrite: overwrite }),
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
    });

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
        vfs.symlink(outputBase, { overwrite: overwrite }),
        concatArray(assert),
      ],
      done
    );
  });

  it('emits an end event', function (done) {
    var symlinkStream = vfs.symlink(outputBase);

    var ended = false;
    function assert(err) {
      expect(ended).toEqual(true);
      done(err);
    }

    symlinkStream.on('end', function () {
      ended = true;
    });

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    pipeline([from([file]), symlinkStream], assert);
  });

  it('emits a finish event', function (done) {
    var symlinkStream = vfs.symlink(outputBase);

    var finished = false;
    symlinkStream.on('finish', function () {
      finished = true;
    });

    function assert(err) {
      expect(finished).toBeTruthy();
      done(err);
    }

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    pipeline([from([file]), symlinkStream], assert);
  });

  it('errors when a non-Vinyl object is emitted', function (done) {
    var file = {};

    function assert(err) {
      expect(err).toEqual(expect.anything());
      expect(err.message).toEqual('Received a non-Vinyl object in `symlink()`');
      done();
    }

    pipeline([from([file]), vfs.symlink(outputBase)], assert);
  });

  it('errors when a buffer-mode stream is piped to it', function (done) {
    var file = Buffer.from('test');

    function assert(err) {
      expect(err).toEqual(expect.anything());
      expect(err.message).toEqual('Received a non-Vinyl object in `symlink()`');
      done();
    }

    pipeline([from([file]), vfs.symlink(outputBase)], assert);
  });

  it('does not get clogged by highWaterMark', function (done) {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: null,
      });
      highwatermarkFiles.push(file);
    }

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concatArray stream cannot be used
        vfs.symlink(outputBase),
      ],
      done
    );
  });

  it('allows backpressure when piped to another, slower stream', function (done) {
    this.timeout(0);

    var expectedCount = 24;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: null,
      });
      highwatermarkFiles.push(file);
    }

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        vfs.symlink(outputBase),
        slowCount(expectedCount),
      ],
      done
    );
  });

  it('respects readable listeners on symlink stream', function (done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var symlinkStream = vfs.symlink(outputBase);

    var readables = 0;
    symlinkStream.on('readable', function () {
      var data = symlinkStream.read();

      if (data != null) {
        readables++;
      }
    });

    function assert(err) {
      expect(readables).toEqual(1);
      done(err);
    }

    pipeline([from([file]), symlinkStream], assert);
  });

  it('respects data listeners on symlink stream', function (done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var symlinkStream = vfs.symlink(outputBase);

    var datas = 0;
    symlinkStream.on('data', function () {
      datas++;
    });

    function assert(err) {
      expect(datas).toEqual(1);
      done(err);
    }

    pipeline([from([file]), symlinkStream], assert);
  });

  it('sinks the stream if all the readable event handlers are removed', function (done) {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: null,
      });
      highwatermarkFiles.push(file);
    }

    var symlinkStream = vfs.symlink(outputBase);

    symlinkStream.on('readable', noop);

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concatArray stream cannot be used
        symlinkStream,
      ],
      done
    );

    process.nextTick(function () {
      symlinkStream.removeListener('readable', noop);
    });
  });

  it('sinks the stream if all the data event handlers are removed', function (done) {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: null,
      });
      highwatermarkFiles.push(file);
    }

    var symlinkStream = vfs.symlink(outputBase);

    symlinkStream.on('data', noop);

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concatArray stream cannot be used
        symlinkStream,
      ],
      done
    );

    process.nextTick(function () {
      symlinkStream.removeListener('data', noop);
    });
  });

  it('does not pass options on to stream', function (done) {
    if (process.versions.node.startsWith("10.") || process.versions.node.startsWith("12.")) {
      this.skip();
      return;
    }

    var sinon = require('sinon');

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    // Reference: https://github.com/gulpjs/vinyl-fs/issues/153
    var read = sinon.fake.returns(false);

    function assert() {
      // Called never because it's not a valid option
      expect(read.called).toEqual(false);
    }

    pipeline(
      [
        from([file]),
        vfs.symlink(outputBase, { read: read }),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not marshall a Vinyl object with isSymbolic method', function (done) {
    var file = new File({
      base: outputBase,
      path: outputPath,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      // Avoid comparing stats because they get reflected
      expect(files[0]).toBe(file);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done
    );
  });

  it('marshalls a Vinyl object without isSymbolic to a newer Vinyl', function (done) {
    var file = new File({
      base: outputBase,
      path: outputPath,
      // Pre-set this because it is set by symlink
      symlink: outputPath,
    });

    breakPrototype(file);

    function assert(files) {
      expect(files.length).toEqual(1);
      // Avoid comparing stats because they get reflected
      files[0].stat = file.stat;
      expect(files[0]).toMatchObject(file);
      expect(files[0]).not.toBe(file);
    }

    pipeline(
      [from([file]), vfs.symlink(outputBase), concatArray(assert)],
      done
    );
  });
});
