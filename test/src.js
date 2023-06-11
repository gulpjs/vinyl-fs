'use strict';

var path = require('path');

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');
var sinon = require('sinon');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var testStreams = require('./utils/test-streams');
var testConstants = require('./utils/test-constants');
var describeStreams = require('./utils/suite');

var inputBase = testConstants.inputBase;
var inputPath = testConstants.inputPath;
var outputBase = testConstants.outputBase;
var outputPath = testConstants.outputPath;
var inputDirpath = testConstants.inputDirpath;
var bomInputPath = testConstants.bomInputPath;
var beBomInputPath = testConstants.beBomInputPath;
var leBomInputPath = testConstants.leBomInputPath;
var beNotBomInputPath = testConstants.beNotBomInputPath;
var leNotBomInputPath = testConstants.leNotBomInputPath;
var ranBomInputPath = testConstants.ranBomInputPath;
var encodedInputPath = testConstants.encodedInputPath;
var encodedContents = testConstants.encodedContents;
var bomContents = testConstants.bomContents;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

describeStreams('.src()', function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var concatArray = streamUtils.concatArray;
  var compareContents = streamUtils.compareContents;

  beforeEach(clean);
  afterEach(clean);

  it('throws on invalid glob (empty)', function (done) {
    var stream;
    try {
      stream = vfs.src();
    } catch (err) {
      expect(err).toEqual(expect.anything());
      expect(stream).not.toEqual(expect.anything());
      done();
    }
  });

  it('throws on invalid glob (empty string)', function (done) {
    var stream;
    try {
      stream = vfs.src('');
    } catch (err) {
      expect(err).toEqual(expect.anything());
      expect(stream).not.toEqual(expect.anything());
      done();
    }
  });

  it('throws on invalid glob (number)', function (done) {
    var stream;
    try {
      stream = vfs.src(123);
    } catch (err) {
      expect(err).toEqual(expect.anything());
      expect(stream).not.toEqual(expect.anything());
      done();
    }
  });

  it('throws on invalid glob (nested array)', function (done) {
    var stream;
    try {
      stream = vfs.src([['./fixtures/*.coffee']]);
    } catch (err) {
      expect(err).toEqual(expect.anything());
      expect(stream).not.toEqual(expect.anything());
      expect(err.message).toMatch('Invalid glob argument');
      done();
    }
  });

  it('throws on invalid glob (empty string in array)', function (done) {
    var stream;
    try {
      stream = vfs.src(['']);
    } catch (err) {
      expect(err).toEqual(expect.anything());
      expect(stream).not.toEqual(expect.anything());
      done();
    }
  });

  it('throws on invalid glob (empty array)', function (done) {
    var stream;
    try {
      stream = vfs.src([]);
    } catch (err) {
      expect(err).toEqual(expect.anything());
      expect(stream).not.toEqual(expect.anything());
      done();
    }
  });

  it('emits an error on file not existing', function (done) {
    function assert(err) {
      expect(err).toEqual(expect.anything());
      done();
    }

    pipeline([vfs.src('./fixtures/noexist.coffee'), concatArray()], assert);
  });

  it('passes through writes', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: Buffer.from(contents),
      stat: fs.statSync(inputPath),
    });

    var srcStream = vfs.src(inputPath);

    function assert(files) {
      expect(files.length).toEqual(2);
      expect(files[0]).toEqual(file);
    }

    srcStream.write(file);

    pipeline([srcStream, concatArray(assert)], done);
  });

  it('removes BOM from utf8-encoded files by default (buffer)', function (done) {
    var expectedContent = Buffer.from(bomContents.replace('X', '8'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContent);
    }

    pipeline([vfs.src(bomInputPath), concatArray(assert)], done);
  });

  it('removes BOM from utf8-encoded files by default (stream)', function (done) {
    var expectedContent = Buffer.from(bomContents.replace('X', '8'));

    function assertContent(contents) {
      expect(contents).toEqual(expectedContent);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(bomInputPath, { buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not remove BOM from utf8-encoded files if option is false (buffer)', function (done) {
    var expectedContent = Buffer.from('\ufeff' + bomContents.replace('X', '8'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContent);
    }

    pipeline(
      [vfs.src(bomInputPath, { removeBOM: false }), concatArray(assert)],
      done
    );
  });

  it('does not remove BOM from utf8-encoded files if option is false (stream)', function (done) {
    var expectedContent = Buffer.from('\ufeff' + bomContents.replace('X', '8'));

    function assertContent(contents) {
      expect(contents).toEqual(expectedContent);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(bomInputPath, { removeBOM: false, buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('removes BOM from utf16be-encoded files by default (buffer)', function (done) {
    var expectedContent = Buffer.from(bomContents.replace('X', '16-BE'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContent);
    }

    pipeline(
      [vfs.src(beBomInputPath, { encoding: 'utf16be' }), concatArray(assert)],
      done
    );
  });

  it('removes BOM from utf16be-encoded files by default (stream)', function (done) {
    var expectedContent = Buffer.from(bomContents.replace('X', '16-BE'));

    function assertContent(contents) {
      expect(contents).toEqual(expectedContent);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, { encoding: 'utf16be', buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not remove BOM from utf16be-encoded files if option is false (buffer)', function (done) {
    var expectedContent = Buffer.from(
      '\ufeff' + bomContents.replace('X', '16-BE')
    );

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContent);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, { encoding: 'utf16be', removeBOM: false }),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not remove BOM from utf16be-encoded files if option is false (stream)', function (done) {
    var expectedContent = Buffer.from(
      '\ufeff' + bomContents.replace('X', '16-BE')
    );

    function assertContent(contents) {
      expect(contents).toEqual(expectedContent);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(beBomInputPath, {
          encoding: 'utf16be',
          removeBOM: false,
          buffer: false,
        }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('removes BOM from utf16le-encoded files by default (buffer)', function (done) {
    var expectedContent = Buffer.from(bomContents.replace('X', '16-LE'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContent);
    }

    pipeline(
      [vfs.src(leBomInputPath, { encoding: 'utf16le' }), concatArray(assert)],
      done
    );
  });

  it('removes BOM from utf16le-encoded files by default (stream)', function (done) {
    var expectedContent = Buffer.from(bomContents.replace('X', '16-LE'));

    function assertContent(contents) {
      expect(contents).toEqual(expectedContent);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, { encoding: 'utf16le', buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not remove BOM from utf16le-encoded files if option is false (buffer)', function (done) {
    var expectedContent = Buffer.from(
      '\ufeff' + bomContents.replace('X', '16-LE')
    );

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContent);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, { encoding: 'utf16le', removeBOM: false }),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not remove BOM from utf16le-encoded files if option is false (stream)', function (done) {
    var expectedContent = Buffer.from(
      '\ufeff' + bomContents.replace('X', '16-LE')
    );

    function assertContent(contents) {
      expect(contents).toEqual(expectedContent);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(leBomInputPath, {
          encoding: 'utf16le',
          removeBOM: false,
          buffer: false,
        }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  // This goes for any non-UTF-8 encoding.
  // UTF-16-BE is enough to demonstrate this is done properly.
  it('does not remove anything that looks like a utf8-encoded BOM from utf16be-encoded files (buffer)', function (done) {
    var expectedContent = fs.readFileSync(beNotBomInputPath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContent);
    }

    pipeline(
      [vfs.src(beNotBomInputPath, { encoding: false }), concatArray(assert)],
      done
    );
  });

  it('does not remove anything that looks like a utf8-encoded BOM from utf16be-encoded files (stream)', function (done) {
    var expectedContent = fs.readFileSync(beNotBomInputPath);

    function assertContent(contents) {
      expect(contents).toEqual(expectedContent);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(beNotBomInputPath, { buffer: false, encoding: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  // This goes for any non-UTF-8 encoding.
  // UTF-16-LE is enough to demonstrate this is done properly.
  it('does not remove anything that looks like a utf8-encoded BOM from utf16le-encoded files (buffer)', function (done) {
    var expectedContent = fs.readFileSync(leNotBomInputPath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContent);
    }

    pipeline(
      [vfs.src(leNotBomInputPath, { encoding: false }), concatArray(assert)],
      done
    );
  });

  it('does not remove anything that looks like a utf8-encoded BOM from utf16le-encoded files (stream)', function (done) {
    var expectedContent = fs.readFileSync(leNotBomInputPath);

    function assertContent(contents) {
      expect(contents).toEqual(expectedContent);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(leNotBomInputPath, { buffer: false, encoding: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not do any transcoding with encoding option set to false (buffer)', function (done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContents);
    }

    pipeline(
      [vfs.src(ranBomInputPath, { encoding: false }), concatArray(assert)],
      done
    );
  });

  it('does not do any transcoding with encoding option set to false (stream)', function (done) {
    var expectedContents = fs.readFileSync(ranBomInputPath);

    function assertContent(contents) {
      expect(contents).toEqual(expectedContents);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(ranBomInputPath, { encoding: false, buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('does not remove utf8 BOM with encoding option set to false (buffer)', function (done) {
    var expectedContents = fs.readFileSync(bomInputPath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContents);
    }

    pipeline(
      [vfs.src(bomInputPath, { encoding: false }), concatArray(assert)],
      done
    );
  });

  it('does not remove utf8 BOM with encoding option set to false (stream)', function (done) {
    var expectedContents = fs.readFileSync(bomInputPath);

    function assertContent(contents) {
      expect(contents).toEqual(expectedContents);
    }
    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(bomInputPath, { encoding: false, buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('transcodes gb2312 to utf8 with encoding option (buffer)', function (done) {
    var expectedContents = Buffer.from(encodedContents);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toEqual(expectedContents);
    }

    pipeline(
      [vfs.src(encodedInputPath, { encoding: 'gb2312' }), concatArray(assert)],
      done
    );
  });

  it('transcodes gb2312 to utf8 with encoding option (stream)', function (done) {
    var expectedContents = Buffer.from(encodedContents);

    function assertContent(contents) {
      expect(contents).toEqual(expectedContents);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(encodedInputPath, { encoding: 'gb2312', buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('reports unsupported encoding errors (buffer)', function (done) {
    function assert(files) {
      expect(files.length).toEqual(0);
    }

    function finish(err) {
      expect(err).toEqual(expect.anything());
      expect(err.message).toEqual('Unsupported encoding: fubar42');
      done();
    }

    pipeline(
      [vfs.src(inputPath, { encoding: 'fubar42' }), concatArray(assert)],
      finish
    );
  });

  it('reports unsupported encoding errors (stream)', function (done) {
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
        vfs.src(inputPath, { encoding: 'fubar42', buffer: false }),
        concatArray(assert),
      ],
      finish
    );
  });

  it('globs files with default settings', function (done) {
    function assert(files) {
      expect(files.length).toEqual(7);
    }

    pipeline(
      [vfs.src('./fixtures/*.txt', { cwd: __dirname }), concatArray(assert)],
      done
    );
  });

  it('globs files with default settings and relative cwd', function (done) {
    var cwd = path.relative(process.cwd(), __dirname);

    function assert(files) {
      expect(files.length).toEqual(7);
    }

    pipeline(
      [vfs.src('./fixtures/*.txt', { cwd: cwd }), concatArray(assert)],
      done
    );
  });

  // TODO: need to normalize the path of a directory vinyl object
  it('globs a directory with default settings', function (done) {
    var inputDirGlob = path.join(inputBase, './f*/');

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isNull()).toEqual(true);
      expect(files[0].isDirectory()).toEqual(true);
    }

    pipeline([vfs.src(inputDirGlob), concatArray(assert)], done);
  });

  it('globs a directory with default settings and relative cwd', function (done) {
    var cwd = path.relative(process.cwd(), __dirname);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isNull()).toEqual(true);
      expect(files[0].isDirectory()).toEqual(true);
    }

    pipeline(
      [vfs.src('./fixtures/f*/', { cwd: cwd }), concatArray(assert)],
      done
    );
  });

  it('streams a directory with default settings', function (done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(inputDirpath);
      expect(files[0].isNull()).toEqual(true);
      expect(files[0].isDirectory()).toEqual(true);
    }

    pipeline([vfs.src(inputDirpath), concatArray(assert)], done);
  });

  it('streams file with with no contents using read: false option', function (done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(inputPath);
      expect(files[0].isNull()).toEqual(true);
      expect(files[0].contents).toEqual(null);
    }

    pipeline([vfs.src(inputPath, { read: false }), concatArray(assert)], done);
  });

  it('streams a file changed after since', function (done) {
    var lastUpdateDate = new Date(+fs.statSync(inputPath).mtime - 1000);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(inputPath);
    }

    pipeline(
      [vfs.src(inputPath, { since: lastUpdateDate }), concatArray(assert)],
      done
    );
  });

  it('does not stream a file changed before since', function (done) {
    var lastUpdateDate = new Date(+fs.statSync(inputPath).mtime + 1000);

    function assert(files) {
      expect(files.length).toEqual(0);
    }

    pipeline(
      [vfs.src(inputPath, { since: lastUpdateDate }), concatArray(assert)],
      done
    );
  });

  it('streams a file with ctime greater than mtime', function (done) {
    fs.mkdirSync(outputBase);
    fs.copyFileSync(inputPath, outputPath);

    setTimeout(function () {
      // chmod changes ctime but not mtime
      fs.chmodSync(outputPath, parseInt('666', 8));

      var lastMtime = new Date(+fs.statSync(outputPath).mtime);

      function assert(files) {
        expect(files.length).toEqual(1);
        expect(files[0].path).toEqual(outputPath);
      }

      pipeline(
        [vfs.src(outputPath, { since: lastMtime }), concatArray(assert)],
        done
      );
    }, 250);
  });

  it('streams a file with streaming contents', function (done) {
    var expectedContent = fs.readFileSync(inputPath);

    function assertContent(contents) {
      expect(contents).toEqual(expectedContent);
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(inputPath);
      expect(files[0].isStream()).toEqual(true);
    }

    pipeline(
      [
        vfs.src(inputPath, { buffer: false }),
        compareContents(assertContent),
        concatArray(assert),
      ],
      done
    );
  });

  it('can be used as a through stream and adds new files to the end', function (done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: fs.readFileSync(inputPath),
      stat: fs.statSync(inputPath),
    });

    function assert(files) {
      expect(files.length).toEqual(2);
      expect(files[0]).toEqual(file);
    }

    pipeline([from([file]), vfs.src(inputPath), concatArray(assert)], done);
  });

  it('can be used at beginning and in the middle', function (done) {
    function assert(files) {
      expect(files.length).toEqual(2);
    }

    pipeline(
      [vfs.src(inputPath), vfs.src(inputPath), concatArray(assert)],
      done
    );
  });

  it('does not pass options on to stream.Transform', function (done) {
    // Reference: https://github.com/gulpjs/vinyl-fs/issues/153
    var read = sinon.fake.returns(false);

    function assert() {
      // Called once to resolve the option
      expect(read.callCount).toEqual(1);
    }

    pipeline([vfs.src(inputPath, { read: read }), concatArray(assert)], done);
  });
});
