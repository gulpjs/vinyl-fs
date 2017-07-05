'use strict';

var path = require('path');

var fs = require('graceful-fs');
var iconv = require('iconv-lite');
var File = require('vinyl');
var expect = require('expect');
var miss = require('mississippi');

var vfs = require('../');

var testConstants = require('./utils/test-constants');

var pipe = miss.pipe;
var from = miss.from;
var concat = miss.concat;
var through = miss.through;

var inputBase = testConstants.inputBase;
var inputPath = testConstants.inputPath;
var inputDirpath = testConstants.inputDirpath;
var bomInputPath = testConstants.bomInputPath;
var beBomInputPath = testConstants.beBomInputPath;
var leBomInputPath = testConstants.leBomInputPath;
var beNotBomInputPath = testConstants.beNotBomInputPath;
var leNotBomInputPath = testConstants.leNotBomInputPath;
var bomContents = testConstants.bomContents;
var encodedInputPath = testConstants.encodedInputPath;
var encodedContents = testConstants.encodedContents;
var contents = testConstants.contents;

describe('.src()', function() {

  it('throws on invalid glob (empty)', function(done) {
    var stream;
    try {
      stream = vfs.src();
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      done();
    }
  });

  it('throws on invalid glob (empty string)', function(done) {
    var stream;
    try {
      stream = vfs.src('');
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      done();
    }
  });

  it('throws on invalid glob (number)', function(done) {
    var stream;
    try {
      stream = vfs.src(123);
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      done();
    }
  });

  it('throws on invalid glob (nested array)', function(done) {
    var stream;
    try {
      stream = vfs.src([['./fixtures/*.coffee']]);
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      expect(err.message).toInclude('Invalid glob argument');
      done();
    }
  });

  it('throws on invalid glob (empty string in array)', function(done) {
    var stream;
    try {
      stream = vfs.src(['']);
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      done();
    }
  });

  it('throws on invalid glob (empty array)', function(done) {
    var stream;
    try {
      stream = vfs.src([]);
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      done();
    }
  });

  it('emits an error on file not existing', function(done) {
    function assert(err) {
      expect(err).toExist();
      done();
    }

    pipe([
      vfs.src('./fixtures/noexist.coffee'),
      concat(),
    ], assert);
  });

  it('passes through writes', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
      stat: fs.statSync(inputPath),
    });

    var srcStream = vfs.src(inputPath);

    function assert(files) {
      expect(files.length).toEqual(2);
      expect(files[0]).toEqual(file);
    }

    srcStream.write(file);

    pipe([
      srcStream,
      concat(assert),
    ], done);
  });

  it('removes BOM from utf8-encoded files by default (buffer)', function(done) {
    var expectedContent = new Buffer(bomContents.replace('X', '8'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toMatch(expectedContent);
    }

    pipe([
      vfs.src(bomInputPath),
      concat(assert),
    ], done);
  });

  it('removes BOM from utf8-encoded files by default (stream)', function(done) {
    var expectedContent = new Buffer(bomContents.replace('X', '8'));

    function assertContent(contents) {
      expect(contents).toMatch(expectedContent);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(bomInputPath, { buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  it('does not remove BOM from utf8-encoded files if option is false (buffer)', function(done) {
    var expectedContent = new Buffer('\ufeff' + bomContents.replace('X', '8'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toMatch(expectedContent);
    }

    pipe([
      vfs.src(bomInputPath, { removeBOM: false }),
      concat(assert),
    ], done);
  });

  it('does not remove BOM from utf8-encoded files if option is false (stream)', function(done) {
    var expectedContent = new Buffer('\ufeff' + bomContents.replace('X', '8'));

    function assertContent(contents) {
      expect(contents).toMatch(expectedContent);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(bomInputPath, { removeBOM: false, buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  it('removes BOM from utf16be-encoded files by default (buffer)', function(done) {
    var expectedContent = new Buffer(bomContents.replace('X', '16-BE'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toMatch(expectedContent);
    }

    pipe([
      vfs.src(beBomInputPath, { encoding: 'utf16be' }),
      concat(assert),
    ], done);
  });

  it('removes BOM from utf16be-encoded files by default (stream)', function(done) {
    var expectedContent = new Buffer(bomContents.replace('X', '16-BE'));

    function assertContent(contents) {
      expect(contents).toMatch(expectedContent);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(beBomInputPath, { encoding: 'utf16be', buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  it('does not remove BOM from utf16be-encoded files if option is false (buffer)', function(done) {
    var expectedContent = new Buffer('\ufeff' + bomContents.replace('X', '16-BE'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toMatch(expectedContent);
    }

    pipe([
      vfs.src(beBomInputPath, { encoding: 'utf16be', removeBOM: false }),
      concat(assert),
    ], done);
  });

  it('does not remove BOM from utf16be-encoded files if option is false (stream)', function(done) {
    var expectedContent = new Buffer('\ufeff' + bomContents.replace('X', '16-BE'));

    function assertContent(contents) {
      expect(contents).toMatch(expectedContent);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(beBomInputPath, { encoding: 'utf16be', removeBOM: false, buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  it('removes BOM from utf16le-encoded files by default (buffer)', function(done) {
    var expectedContent = new Buffer(bomContents.replace('X', '16-LE'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toMatch(expectedContent);
    }

    pipe([
      vfs.src(leBomInputPath, { encoding: 'utf16le' }),
      concat(assert),
    ], done);
  });

  it('removes BOM from utf16le-encoded files by default (stream)', function(done) {
    var expectedContent = new Buffer(bomContents.replace('X', '16-LE'));

    function assertContent(contents) {
      expect(contents).toMatch(expectedContent);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(leBomInputPath, { encoding: 'utf16le', buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  it('does not remove BOM from utf16le-encoded files if option is false (buffer)', function(done) {
    var expectedContent = new Buffer('\ufeff' + bomContents.replace('X', '16-LE'));

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toMatch(expectedContent);
    }

    pipe([
      vfs.src(leBomInputPath, { encoding: 'utf16le', removeBOM: false }),
      concat(assert),
    ], done);
  });

  it('does not remove BOM from utf16le-encoded files if option is false (stream)', function(done) {
    var expectedContent = new Buffer('\ufeff' + bomContents.replace('X', '16-LE'));

    function assertContent(contents) {
      expect(contents).toMatch(expectedContent);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(leBomInputPath, { encoding: 'utf16le', removeBOM: false, buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  // This goes for any non-UTF-8 encoding.
  // UTF-16-BE is enough to demonstrate this is done properly.
  it('does not remove anything that looks like a utf8-encoded BOM from utf16be-encoded files (buffer)', function(done) {
    var expectedContent = fs.readFileSync(beNotBomInputPath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toMatch(expectedContent);
    };

    pipe([
      vfs.src(beNotBomInputPath),
      concat(assert),
    ], done);
  });

  it('does not remove anything that looks like a utf8-encoded BOM from utf16be-encoded files (stream)', function(done) {
    var expectedContent = fs.readFileSync(beNotBomInputPath);

    function assertContent(contents) {
      expect(contents).toMatch(expectedContent);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(beNotBomInputPath, { buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  // This goes for any non-UTF-8 encoding.
  // UTF-16-LE is enough to demonstrate this is done properly.
  it('does not remove anything that looks like a utf8-encoded BOM from utf16le-encoded files (buffer)', function(done) {
    var expectedContent = fs.readFileSync(leNotBomInputPath);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toMatch(expectedContent);
    }

    pipe([
      vfs.src(leNotBomInputPath),
      concat(assert),
    ], done);
  });

  it('does not remove anything that looks like a utf8-encoded BOM from utf16le-encoded files (stream)', function(done) {
    var expectedContent = fs.readFileSync(leNotBomInputPath);

    function assertContent(contents) {
      expect(contents).toMatch(expectedContent);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(leNotBomInputPath, { buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  it('transcodes gb2312 to utf8 with encoding option (buffer)', function(done) {
    var expectedContents = new Buffer(encodedContents);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].contents).toMatch(expectedContents);
    }

    pipe([
      vfs.src(encodedInputPath, { encoding: 'gb2312' }),
      concat(assert),
    ], done);
  });

  it('transcodes gb2312 to utf8 with encoding option (stream)', function(done) {
    var expectedContents = iconv.encode(encodedContents, 'utf8');

    function assertContent(contents) {
      expect(contents).toMatch(expectedContents);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(encodedInputPath, { encoding: 'gb2312', buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  it('reports unsupported encoding errors (buffer)', function(done) {
    function assert(files) {
      expect(files.length).toEqual(0);
    }

    function finish(err) {
      expect(err).toExist();
      expect(err.message).toEqual('Unsupported encoding: fubar42');
      done();
    }

    pipe([
      vfs.src(inputPath, { encoding: 'fubar42' }),
      concat(assert),
    ], finish);
  });

  it('reports unsupported encoding errors (stream)', function(done) {
    function assert(files) {
      expect(files.length).toEqual(0);
    }

    function finish(err) {
      expect(err).toExist();
      expect(err.message).toEqual('Unsupported encoding: fubar42');
      done();
    }

    pipe([
      vfs.src(inputPath, { encoding: 'fubar42', buffer: false }),
      concat(assert),
    ], finish);
  });


  it('globs files with default settings', function(done) {
    function assert(files) {
      expect(files.length).toEqual(7);
    }

    pipe([
      vfs.src('./fixtures/*.txt', { cwd: __dirname }),
      concat(assert),
    ], done);
  });

  it('globs files with default settings and relative cwd', function(done) {
    var cwd = path.relative(process.cwd(), __dirname);

    function assert(files) {
      expect(files.length).toEqual(7);
    }

    pipe([
      vfs.src('./fixtures/*.txt', { cwd: cwd }),
      concat(assert),
    ], done);
  });

  // TODO: need to normalize the path of a directory vinyl object
  it('globs a directory with default settings', function(done) {
    var inputDirGlob = path.join(inputBase, './f*/');

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isNull()).toEqual(true);
      expect(files[0].isDirectory()).toEqual(true);
    }

    pipe([
      vfs.src(inputDirGlob),
      concat(assert),
    ], done);
  });

  it('globs a directory with default settings and relative cwd', function(done) {
    var cwd = path.relative(process.cwd(), __dirname);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].isNull()).toEqual(true);
      expect(files[0].isDirectory()).toEqual(true);
    }

    pipe([
      vfs.src('./fixtures/f*/', { cwd: cwd }),
      concat(assert),
    ], done);
  });

  it('streams a directory with default settings', function(done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(inputDirpath);
      expect(files[0].isNull()).toEqual(true);
      expect(files[0].isDirectory()).toEqual(true);
    }

    pipe([
      vfs.src(inputDirpath),
      concat(assert),
    ], done);
  });

  it('streams file with with no contents using read: false option', function(done) {
    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(inputPath);
      expect(files[0].isNull()).toEqual(true);
      expect(files[0].contents).toNotExist();
    }

    pipe([
      vfs.src(inputPath, { read: false }),
      concat(assert),
    ], done);
  });

  it('streams a file changed after since', function(done) {
    var lastUpdateDate = new Date(+fs.statSync(inputPath).mtime - 1000);

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(inputPath);
    }

    pipe([
      vfs.src(inputPath, { since: lastUpdateDate }),
      concat(assert),
    ], done);
  });

  it('does not stream a file changed before since', function(done) {
    var lastUpdateDate = new Date(+fs.statSync(inputPath).mtime + 1000);

    function assert(files) {
      expect(files.length).toEqual(0);
    }

    pipe([
      vfs.src(inputPath, { since: lastUpdateDate }),
      concat(assert),
    ], done);
  });

  it('streams a file with streaming contents', function(done) {
    var expectedContent = fs.readFileSync(inputPath);

    function assertContent(contents) {
      expect(contents).toMatch(expectedContent);
    }

    function compareContents(file, enc, cb) {
      pipe([
        file.contents,
        concat(assertContent),
      ], function(err) {
        cb(err, file);
      });
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0].path).toEqual(inputPath);
      expect(files[0].isStream()).toEqual(true);
    }

    pipe([
      vfs.src(inputPath, { buffer: false }),
      through.obj(compareContents),
      concat(assert),
    ], done);
  });

  it('can be used as a through stream and adds new files to the end', function(done) {
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

    pipe([
      from.obj([file]),
      vfs.src(inputPath),
      concat(assert),
    ], done);
  });

  it('can be used at beginning and in the middle', function(done) {
    function assert(files) {
      expect(files.length).toEqual(2);
    }

    pipe([
      vfs.src(inputPath),
      vfs.src(inputPath),
      concat(assert),
    ], done);
  });

  it('does not pass options on to through2', function(done) {
    // Reference: https://github.com/gulpjs/vinyl-fs/issues/153
    var read = expect.createSpy().andReturn(false);

    function assert() {
      // Called once to resolve the option
      expect(read.calls.length).toEqual(1);
    }

    pipe([
      vfs.src(inputPath, { read: read }),
      concat(assert),
    ], done);
  });
});
