var spies = require('./spy');
var chmodSpy = spies.chmodSpy;
var statSpy = spies.statSpy;

var vfs = require('../');

var path = require('path');
var fs = require('graceful-fs');

var bufEqual = require('buffer-equal');
var through = require('through2');
var File = require('vinyl');

var should = require('should');
require('mocha');

var dataWrap = function(fn) {
  return function(data, enc, cb) {
    fn(data);
    cb();
  };
};

describe('source stream', function() {

  it('should explode on invalid glob (empty)', function(done) {
    var stream;
    try {
      stream = vfs.src();
    } catch (err) {
      should.exist(err);
      should.not.exist(stream);
      done();
    }
  });

  it('should explode on invalid glob (number)', function(done) {
    var stream;
    try {
      stream = vfs.src(123);
    } catch (err) {
      should.exist(err);
      should.not.exist(stream);
      done();
    }
  });

  it('should not explode on invalid glob (empty array)', function(done) {
    var stream = vfs.src([]);
    stream.once('data', done);
    stream.once('end', function(){
      done();
    });
  });

  it('should pass through writes', function(done) {
    var expectedPath = path.join(__dirname, './fixtures/test.coffee');
    var expectedContent = fs.readFileSync(expectedPath);

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: expectedPath,
      contents: expectedContent
    });

    var stream = vfs.src('./fixtures/noexist.coffee');
    stream.on('data', function(file){
      file.should.equal(expectedFile);
      bufEqual(file.contents, expectedContent).should.equal(true);
      done();
    });
    stream.write(expectedFile);
  });

  it('should strip BOM from UTF-8-encoded files', function(done) {
    var expectedPath = path.join(__dirname, './fixtures/bom-utf8.txt');
    var expectedContent = fs.readFileSync(expectedPath)
      // U+FEFF takes up 3 bytes in UTF-8: http://mothereff.in/utf-8#%EF%BB%BF
      .slice(3);

    var onEnd = function(){
      buffered.length.should.equal(1);
      should.exist(buffered[0].stat);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isBuffer().should.equal(true);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    };

    var stream = vfs.src('./fixtures/bom-utf8.txt', {cwd: __dirname});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should not strip anything that looks like a UTF-8-encoded BOM from UTF-16-BE-encoded files', function(done) {
    // Note: this goes for any non-UTF-8 encoding, but testing for UTF-16-BE
    // and UTF-16-LE is enough to demonstrate this is done properly.
    var expectedPath = path.join(__dirname, './fixtures/bom-utf16be.txt');
    var expectedContent = fs.readFileSync(expectedPath);

    var onEnd = function(){
      buffered.length.should.equal(1);
      should.exist(buffered[0].stat);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isBuffer().should.equal(true);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    };

    var stream = vfs.src('./fixtures/bom-utf16be.txt', {cwd: __dirname});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should not strip anything that looks like a UTF-8-encoded BOM from UTF-16-LE-encoded files', function(done) {
    // Note: this goes for any non-UTF-8 encoding, but testing for UTF-16-BE
    // and UTF-16-LE is enough to demonstrate this is done properly.
    var expectedPath = path.join(__dirname, './fixtures/bom-utf16le.txt');
    var expectedContent = fs.readFileSync(expectedPath);

    var onEnd = function(){
      buffered.length.should.equal(1);
      should.exist(buffered[0].stat);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isBuffer().should.equal(true);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    };

    var stream = vfs.src('./fixtures/bom-utf16le.txt', {cwd: __dirname});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should glob a file with default settings', function(done) {
    var expectedPath = path.join(__dirname, './fixtures/test.coffee');
    var expectedContent = fs.readFileSync(expectedPath);

    var onEnd = function(){
      buffered.length.should.equal(1);
      should.exist(buffered[0].stat);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isBuffer().should.equal(true);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    };

    var stream = vfs.src('./fixtures/*.coffee', {cwd: __dirname});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should glob a file with default settings and relative cwd', function(done) {
    var expectedPath = path.join(__dirname, './fixtures/test.coffee');
    var expectedContent = fs.readFileSync(expectedPath);

    var onEnd = function(){
      buffered.length.should.equal(1);
      should.exist(buffered[0].stat);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isBuffer().should.equal(true);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    };

    var stream = vfs.src('./fixtures/*.coffee', {cwd: path.relative(process.cwd(), __dirname)});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should glob a directory with default settings', function(done) {
    var expectedPath = path.join(__dirname, './fixtures/wow');

    var onEnd = function(){
      buffered.length.should.equal(1);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isNull().should.equal(true);
      buffered[0].isDirectory().should.equal(true);
      done();
    };

    var stream = vfs.src('./fixtures/wow/', {cwd: __dirname});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should glob a file with with no contents', function(done) {
    var expectedPath = path.join(__dirname, './fixtures/test.coffee');
    var expectedContent = fs.readFileSync(expectedPath);

    var onEnd = function(){
      buffered.length.should.equal(1);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isNull().should.equal(true);
      should.not.exist(buffered[0].contents);
      done();
    };

    var stream = vfs.src('./fixtures/*.coffee', {cwd: __dirname, read: false});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should glob a file changed after since', function(done) {
    var expectedPath = path.join(__dirname, './fixtures/test.coffee');
    var expectedContent = fs.readFileSync(expectedPath);
    var lastUpdateDate = new Date(+fs.statSync(expectedPath).mtime - 1000);

    var onEnd = function(){
      buffered.length.should.equal(1);
      should.exist(buffered[0].stat);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isBuffer().should.equal(true);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    };

    var stream = vfs.src('./fixtures/*.coffee', {cwd: __dirname, since: lastUpdateDate});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should not glob a file changed before since', function(done) {
    var expectedPath = path.join(__dirname, './fixtures/test.coffee');
    var lastUpdateDate = new Date(+fs.statSync(expectedPath).mtime + 1000);

    var onEnd = function(){
      buffered.length.should.equal(0);
      done();
    };

    var stream = vfs.src('./fixtures/*.coffee', {cwd: __dirname, since: lastUpdateDate});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should glob a file with streaming contents', function(done) {
    var expectedPath = path.join(__dirname, './fixtures/test.coffee');
    var expectedContent = fs.readFileSync(expectedPath);

    var onEnd = function(){
      buffered.length.should.equal(1);
      should.exist(buffered[0].stat);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isStream().should.equal(true);

      var contentBuffer = new Buffer([]);
      var contentBufferStream = through(dataWrap(function(data){
        contentBuffer = Buffer.concat([contentBuffer, data]);
      }));
      buffered[0].contents.pipe(contentBufferStream);
      buffered[0].contents.once('end', function(){
        bufEqual(contentBuffer, expectedContent);
        done();
      });
    };

    var stream = vfs.src('./fixtures/*.coffee', {cwd: __dirname, buffer: false});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
  });

  it('should pass files through', function(done) {
    var expectedPaths = [
      path.join(__dirname, './fixtures/test.coffee'),
      path.join(__dirname, './fixtures/wow/suchempty')
    ];
    var expectedContents = expectedPaths.map(function(path/* more args here so can't pass function directly */) {
      return fs.readFileSync(path);
    });

    var onEnd = function(){
      buffered.length.should.equal(2);
      buffered.forEach(function(file) {
        should.exist(file.stat);
        file.isBuffer().should.equal(true);

        expectedPaths.some(function(expectedPath) {
          return file.path === expectedPath;
        }).should.equal(true);

        expectedContents.some(function(expectedContent) {
          return bufEqual(file.contents, expectedContent);
        }).should.equal(true);
      });
      done();
    };

    var stream1 = vfs.src('./fixtures/*.coffee', {cwd: __dirname});
    var stream2 = vfs.src('./fixtures/wow/*', {cwd: __dirname, passthrough: true});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream1.pipe(stream2).pipe(bufferStream);
  });

  it('should pass files through (empty glob array in passthrough stream)', function(done) {
    var expectedPaths = [
      path.join(__dirname, './fixtures/test.coffee'),
      path.join(__dirname, './fixtures/wow/suchempty')
    ];
    var expectedContents = expectedPaths.map(function(path/* more args here so can't pass function directly */) {
      return fs.readFileSync(path);
    });

    var onEnd = function(){
      buffered.length.should.equal(2);
      buffered.forEach(function(file) {
        should.exist(file.stat);
        file.isBuffer().should.equal(true);

        expectedPaths.some(function(expectedPath) {
          return file.path === expectedPath;
        }).should.equal(true);

        expectedContents.some(function(expectedContent) {
          return bufEqual(file.contents, expectedContent);
        }).should.equal(true);
      });
      done();
    };

    var stream1 = vfs.src(['./fixtures/*.coffee', './fixtures/wow/*'], {cwd: __dirname});
    var stream2 = vfs.src([], {cwd: __dirname, passthrough: true});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream1.pipe(stream2).pipe(bufferStream);
  });

  it('should pass files through (empty glob array in source stream)', function(done) {
    var expectedPaths = [
      path.join(__dirname, './fixtures/test.coffee'),
      path.join(__dirname, './fixtures/wow/suchempty')
    ];
    var expectedContents = expectedPaths.map(function(path/* more args here so can't pass function directly */) {
      return fs.readFileSync(path);
    });

    var onEnd = function(){
      buffered.length.should.equal(2);
      buffered.forEach(function(file) {
        should.exist(file.stat);
        file.isBuffer().should.equal(true);

        expectedPaths.some(function(expectedPath) {
          return file.path === expectedPath;
        }).should.equal(true);

        expectedContents.some(function(expectedContent) {
          return bufEqual(file.contents, expectedContent);
        }).should.equal(true);
      });
      done();
    };

    var stream1 = vfs.src([], {cwd: __dirname});
    var stream2 = vfs.src(['./fixtures/*.coffee', './fixtures/wow/*'], {cwd: __dirname, passthrough: true});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream1.pipe(stream2).pipe(bufferStream);
  });

  it('should still end when passing through empty streams', function(done) {
    var onEnd = function(){
      buffered.length.should.equal(0);
      done();
    };

    var stream1 = vfs.src([], {cwd: __dirname});
    var stream2 = vfs.src([], {cwd: __dirname, passthrough: true});

    var buffered = [];
    bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream1.pipe(stream2).pipe(bufferStream);
  });

});
