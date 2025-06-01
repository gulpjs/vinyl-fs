'use strict';

var path = require('path');

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var statMode = require('./utils/stat-mode');
var mockError = require('./utils/mock-error');
var applyUmask = require('./utils/apply-umask');
var testStreams = require('./utils/test-streams');
var always = require('./utils/always');
var testConstants = require('./utils/test-constants');
var breakPrototype = require('./utils/break-prototype');
var describeStreams = require('./utils/suite');

function noop() {}

var inputRelative = testConstants.inputRelative;
var outputRelative = testConstants.outputRelative;
var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var outputRenamePath = testConstants.outputRenamePath;
var inputDirpath = testConstants.inputDirpath;
var outputDirpath = testConstants.outputDirpath;
var encodedInputPath = testConstants.encodedInputPath;
var ranBomInputPath = testConstants.ranBomInputPath;
var contents = testConstants.contents;
var sourcemapContents = testConstants.sourcemapContents;
var bomContents = testConstants.bomContents;
var encodedContents = testConstants.encodedContents;

function makeSourceMap() {
  return {
    version: 3,
    file: inputRelative,
    names: [],
    mappings: '',
    sources: [inputRelative],
    sourcesContent: [contents],
  };
}

var clean = cleanup(outputBase);

describeStreams('.dest()', function (stream) {
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
  var rename = streamUtils.rename;
  var includes = streamUtils.includes;
  var slowCount = streamUtils.slowCount;
  var chunks = streamUtils.chunks;
  var concatArray = streamUtils.concatArray;
  var compareContents = streamUtils.compareContents;
  var fromError = streamUtils.fromError;

  beforeEach(clean);
  afterEach(clean);

  it('throws on no folder argument', function (done) {
    function noFolder() {
      vfs.dest();
    }

    expect(noFolder).toThrow(
      'Invalid dest() folder argument. Please specify a non-empty string or a function.'
    );
    done();
  });

  it('throws on empty string folder argument', function (done) {
    function emptyFolder() {
      vfs.dest('');
    }

    expect(emptyFolder).toThrow(
      'Invalid dest() folder argument. Please specify a non-empty string or a function.'
    );
    done();
  });

  it('accepts the sourcemap option as true', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toContain(file);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: true }),
        concatArray(assert),
      ],
      done
    );
  });

  it('accepts the sourcemap option as a string', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assert(files) {
      expect(files.length).toEqual(2);
      expect(files).toContain(file);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: '.' }),
        concatArray(assert),
      ],
      done
    );
  });

  it('inlines sourcemaps when option is true', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].contents.toString()).toMatch(
        new RegExp(sourcemapContents)
      );
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: true }),
        concatArray(assert),
      ],
      done
    );
  });

  it('generates an extra File when option is a string', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      sourceMap: makeSourceMap(),
    });

    function assert(files) {
      expect(files.length).toEqual(2);
      expect(files).toContain(file);
      expect(files[0].contents.toString()).toMatch(
        new RegExp('//# sourceMappingURL=test.txt.map')
      );
      expect(files[1].contents.toString()).toEqual(
        JSON.stringify(makeSourceMap())
      );
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { sourcemaps: '.' }),
        concatArray(assert),
      ],
      done
    );
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
        vfs.dest(outputRelative, { cwd: __dirname }),
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

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('does not write null files', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      var exists = fs.existsSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(exists).toEqual(false);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('writes buffer files to the right folder with relative cwd', function (done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].cwd).toEqual(__dirname);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(outputContents).toEqual(contents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputRelative, { cwd: cwd }),
        concatArray(assert),
      ],
      done
    );
  });

  it('writes buffer files to the right folder with function and relative cwd', function (done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function outputFn(f) {
      expect(f).toEqual(expect.anything());
      expect(f).toEqual(file);
      return outputRelative;
    }

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].cwd).toEqual(__dirname);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(outputContents).toEqual(contents);
    }

    pipeline(
      [from([file]), vfs.dest(outputFn, { cwd: cwd }), concatArray(assert)],
      done
    );
  });

  it('writes buffer files to the right folder', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(outputContents).toEqual(contents);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('writes streaming files to the right folder', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      expect(files[0].path).toEqual(outputPath);
      expect(outputContents).toEqual(contents);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('writes large streaming files to the right folder', function (done) {
    this.timeout(0);

    var size = 40000;

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: chunks(size),
    });

    function assert(files) {
      var stats = fs.lstatSync(outputPath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(stats.size).toEqual(size);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('writes directories to the right folder', function (done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(files) {
      var stats = fs.lstatSync(outputDirpath);

      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(files[0].base).toEqual(outputBase);
      // TODO: normalize this path
      expect(files[0].path).toEqual(outputDirpath);
      expect(stats.isDirectory()).toEqual(true);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('allows piping multiple dests in streaming mode', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert() {
      var outputContents1 = fs.readFileSync(outputPath, 'utf8');
      var outputContents2 = fs.readFileSync(outputRenamePath, 'utf8');
      expect(outputContents1).toEqual(contents);
      expect(outputContents2).toEqual(contents);
    }

    pipeline(
      [
        from([file]),
        includes({ path: inputPath }),
        vfs.dest(outputBase),
        rename(outputRenamePath),
        includes({ path: outputRenamePath }),
        vfs.dest(outputBase),
        concatArray(assert),
      ],
      done
    );
  });

  it('writes new files with the default user mode', function (done) {
    var expectedMode = applyUmask('666');

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toContain(file);
      expect(statMode(outputPath)).toEqual(expectedMode);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('reports i/o errors', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(err) {
      expect(err).toEqual(expect.anything());
      done();
    }

    fs.mkdirSync(outputBase);
    fs.closeSync(fs.openSync(outputPath, 'w'));
    fs.chmodSync(outputPath, 0);

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it('reports stat errors', function (done) {
    if (process.versions.node.startsWith("10.") || process.versions.node.startsWith("12.")) {
      this.skip();
      return;
    }

    var sinon = require('sinon');

    var expectedMode = applyUmask('722');

    var fstatSpy = sinon.stub(fs, 'fstat').callsFake(mockError);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: {
        mode: expectedMode,
      },
    });

    function assert(err) {
      expect(err).toEqual(expect.anything());
      expect(fstatSpy.callCount).toEqual(1);
      done();
    }

    fs.mkdirSync(outputBase);
    fs.closeSync(fs.openSync(outputPath, 'w'));

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it('does not overwrite files with overwrite option set to false', function (done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
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
        vfs.dest(outputBase, { overwrite: false }),
        concatArray(assert),
      ],
      done
    );
  });

  it('overwrites files with overwrite option set to true', function (done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
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
        vfs.dest(outputBase, { overwrite: true }),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not overwrite files with overwrite option set to a function that returns false', function (done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
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
        vfs.dest(outputBase, { overwrite: overwrite }),
        concatArray(assert),
      ],
      done
    );
  });

  it('overwrites files with overwrite option set to a function that returns true', function (done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
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
        vfs.dest(outputBase, { overwrite: overwrite }),
        concatArray(assert),
      ],
      done
    );
  });

  it('appends content with append option set to true', function (done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(existingContents + contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { append: true }),
        concatArray(assert),
      ],
      done
    );
  });

  it('appends content with append option set to a function that returns true', function (done) {
    var existingContents = 'Lorem Ipsum';

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function append(f) {
      expect(f).toEqual(file);
      return true;
    }

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath, 'utf8');

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(existingContents + contents);
    }

    // This should be overwritten
    fs.mkdirSync(outputBase);
    fs.writeFileSync(outputPath, existingContents);

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { append: append }),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not do any transcoding with encoding defaulted (buffer)', function (done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: expectedContents,
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not do any transcoding with encoding option set to false (buffer)', function (done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: expectedContents,
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: false }),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not do any transcoding with encoding defaulted (stream)', function (done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: fs.createReadStream(ranBomInputPath),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not do any transcoding with encoding option set to false (stream)', function (done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: fs.createReadStream(ranBomInputPath),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: false }),
        concatArray(assert),
      ],
      done
    );
  });

  it('transcodes utf8 to gb2312 with encoding option (buffer)', function (done) {
    var expectedContents = fs.readFileSync(encodedInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(encodedContents),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: 'gb2312' }),
        concatArray(assert),
      ],
      done
    );
  });

  it('transcodes utf8 to gb2312 with encoding option (stream)', function (done) {
    var expectedContents = fs.readFileSync(encodedInputPath);
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([encodedContents]),
    });

    function assert(files) {
      var outputContents = fs.readFileSync(outputPath);

      expect(files.length).toEqual(1);
      expect(outputContents).toEqual(expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: 'gb2312' }),
        concatArray(assert),
      ],
      done
    );
  });

  it('sends utf8 downstream despite encoding option, preserve BOM if any (buffer)', function (done) {
    var expectedString = '\ufeff' + bomContents.replace('X', '16-BE');
    var expectedContents = Buffer.from(expectedString);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: expectedContents,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isBuffer()).toEqual(true);
      expect(files[0].contents).toEqual(expectedContents);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: 'utf16be' }),
        concatArray(assert),
      ],
      done
    );
  });

  it('sends utf8 downstream despite encoding option, preserve BOM if any (stream)', function (done) {
    var expectedString = '\ufeff' + bomContents.replace('X', '16-BE');
    var expectedContents = Buffer.from(expectedString);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([expectedString]),
    });

    function assertContent(contents) {
      expect(contents).toEqual(expectedContents);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: 'utf16be' }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('reports unsupported encoding errors (buffer)', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
    });

    function assert(files) {
      expect(files.length).toEqual(0);
    }

    function finish(err) {
      expect(err).toEqual(expect.anything());
      expect(err.message).toEqual('Unsupported encoding: fubar42');
      done();
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: 'fubar42' }),
        concatArray(assert),
      ],
      finish
    );
  });

  it('reports unsupported encoding errors (stream)', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    function assert(files) {
      expect(files.length).toEqual(0);
    }

    function finish(err) {
      expect(err).toEqual(expect.anything());
      expect(err.message).toEqual('Unsupported encoding: fubar42');
      done();
    }

    pipeline(
      [
        from([file]),
        vfs.dest(outputBase, { encoding: 'fubar42' }),
        concatArray(assert),
      ],
      finish
    );
  });

  it('emits a finish event', function (done) {
    var destStream = vfs.dest(outputBase);

    var finished = false;
    destStream.once('finish', function () {
      finished = true;
    });

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from('1234567890'),
    });

    function finish() {
      expect(finished).toBeTruthy();
      done();
    }

    pipeline([from([file]), destStream], finish);
  });

  it('does not get clogged by highWaterMark', function (done) {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
      });
      highwatermarkFiles.push(file);
    }

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concat-stream cannot be used
        vfs.dest(outputBase),
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
        contents: Buffer.from(contents),
      });
      highwatermarkFiles.push(file);
    }

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        vfs.dest(outputBase),
        slowCount(expectedCount),
      ],
      done
    );
  });

  it('respects readable listeners on destination stream', function (done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var destStream = vfs.dest(outputBase);

    var readables = 0;
    destStream.on('readable', function () {
      var data = destStream.read();

      if (data != null) {
        readables++;
      }
    });

    function assert(err) {
      expect(readables).toEqual(1);
      done(err);
    }

    pipeline([from([file]), destStream], assert);
  });

  it('respects data listeners on destination stream', function (done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var destStream = vfs.dest(outputBase);

    var datas = 0;
    destStream.on('data', function () {
      datas++;
    });

    function assert(err) {
      expect(datas).toEqual(1);
      done(err);
    }

    pipeline([from([file]), destStream], assert);
  });

  it('sinks the stream if all the readable event handlers are removed', function (done) {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
      });
      highwatermarkFiles.push(file);
    }

    var destStream = vfs.dest(outputBase);

    destStream.on('readable', noop);

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concat-stream cannot be used
        destStream,
      ],
      done
    );

    process.nextTick(function () {
      destStream.removeListener('readable', noop);
    });
  });

  it('sinks the stream if all the data event handlers are removed', function (done) {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
      });
      highwatermarkFiles.push(file);
    }

    var destStream = vfs.dest(outputBase);

    destStream.on('data', noop);

    pipeline(
      [
        from(highwatermarkFiles),
        count(expectedCount),
        // Must be in the Writable position to test this
        // So concat-stream cannot be used
        destStream,
      ],
      done
    );

    process.nextTick(function () {
      destStream.removeListener('data', noop);
    });
  });

  it('successfully processes files with streaming contents', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: from([contents]),
    });

    pipeline([from([file]), vfs.dest(outputBase)], done);
  });

  it('errors when a non-Vinyl object is emitted', function (done) {
    var file = {};

    function assert(err) {
      expect(err).toEqual(expect.anything());
      expect(err.message).toEqual('Received a non-Vinyl object in `dest()`');
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it('errors when a buffer-mode stream is piped to it', function (done) {
    var file = Buffer.from('test');

    function assert(err) {
      expect(err).toEqual(expect.anything());
      expect(err.message).toEqual('Received a non-Vinyl object in `dest()`');
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it('errors if we cannot mkdirp', function (done) {
    if (process.versions.node.startsWith("10.") || process.versions.node.startsWith("12.")) {
      this.skip();
      return;
    }

    var sinon = require('sinon');

    var mkdirSpy = sinon.stub(fs, 'mkdir').callsFake(mockError);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(err) {
      expect(err).toEqual(expect.anything());
      expect(mkdirSpy.callCount).toEqual(1);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it('errors if vinyl object is a directory and we cannot mkdirp', function (done) {
    if (process.versions.node.startsWith("10.") || process.versions.node.startsWith("12.")) {
      this.skip();
      return;
    }

    var sinon = require('sinon');

    var ogMkdir = fs.mkdir;

    var mkdirSpy = sinon.stub(fs, 'mkdir').callsFake(function () {
      if (mkdirSpy.callCount > 1) {
        mockError.apply(this, arguments);
      } else {
        ogMkdir.apply(this, arguments);
      }
    });

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(err) {
      expect(err).toEqual(expect.anything());
      expect(mkdirSpy.callCount).toEqual(2);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  // TODO: is this correct behavior? had to adjust it
  it('does not error if vinyl object is a directory and we cannot open it', function (done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
        mode: applyUmask('000'),
      },
    });

    function assert() {
      var exists = fs.existsSync(outputDirpath);
      expect(exists).toEqual(true);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('errors if vinyl object is a directory and open errors', function (done) {
    if (process.versions.node.startsWith("10.") || process.versions.node.startsWith("12.")) {
      this.skip();
      return;
    }

    var sinon = require('sinon');

    var openSpy = sinon.stub(fs, 'open').callsFake(mockError);

    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
      stat: {
        isDirectory: always(true),
      },
    });

    function assert(err) {
      expect(err).toEqual(expect.anything());
      expect(openSpy.callCount).toEqual(1);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
  });

  it('errors if content stream errors', function (done) {
    var error = new Error('mocked error');

    var contentStream = fromError(error);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: contentStream,
    });

    function assert(err) {
      expect(err).toBe(error);
      done();
    }

    pipeline([from([file]), vfs.dest(outputBase)], assert);
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
      expect(read.callCount).toEqual(0);
    }

    pipeline(
      [from([file]), vfs.dest(outputBase, { read: read }), concatArray(assert)],
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
      expect(files[0]).toEqual(file);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });

  it('marshalls a Vinyl object without isSymbolic to a newer Vinyl', function (done) {
    var file = new File({
      base: outputBase,
      path: outputPath,
    });

    breakPrototype(file);

    function assert(files) {
      expect(files.length).toEqual(1);
      // Avoid comparing stats because they get reflected
      files[0].stat = file.stat;
      expect(files[0]).toMatchObject(file);
      expect(files[0]).not.toBe(file);
    }

    pipeline([from([file]), vfs.dest(outputBase), concatArray(assert)], done);
  });
});
