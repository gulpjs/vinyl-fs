'use strict';

var spies = require('./spy');
var chmodSpy = spies.chmodSpy;
var statSpy = spies.statSpy;

var vfs = require('../');

var path = require('path');
var fs = require('graceful-fs');
var rimraf = require('rimraf');

var bufEqual = require('buffer-equal');
var through = require('through2');
var File = require('vinyl');

var should = require('should');
require('mocha');

var wipeOut = function(cb) {
  rimraf(path.join(__dirname, './out-fixtures/'), cb);
  spies.setError('false');
  statSpy.reset();
  chmodSpy.reset();
};

var dataWrap = function(fn) {
  return function(data, enc, cb) {
    fn(data);
    cb();
  };
};

var realMode = function(n) {
  return n & parseInt('777', 8);
};

describe('symlink stream', function() {
  beforeEach(wipeOut);
  afterEach(wipeOut);

  it('should explode on invalid folder', function(done) {
    var stream;
    try {
      stream = gulp.symlink();
    } catch (err) {
      should.exist(err);
      should.not.exist(stream);
      done();
    }
  });

  it('should pass through writes with cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should pass through writes with default cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      done();
    };

    var stream = vfs.symlink(path.join(__dirname, './out-fixtures/'));

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should make link to the right folder with relative cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedContents = fs.readFileSync(inputPath);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(__dirname, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(true);
      bufEqual(fs.readFileSync(expectedPath), expectedContents).should.equal(true);
      fs.readlinkSync(expectedPath).should.equal(inputPath);
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', { cwd: path.relative(process.cwd(), __dirname) });


    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write buffer files to the right folder with function and relative cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedContents = fs.readFileSync(inputPath);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(__dirname, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(true);
      bufEqual(fs.readFileSync(expectedPath), expectedContents).should.equal(true);
      fs.readlinkSync(expectedPath).should.equal(inputPath);
      done();
    };

    var stream = vfs.symlink(function(file) {
      should.exist(file);
      file.should.equal(expectedFile);
      return './out-fixtures';
    }, { cwd: path.relative(process.cwd(), __dirname) });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write buffer files to the right folder', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('655', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: expectedMode,
      },
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(__dirname, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(true);
      bufEqual(fs.readFileSync(expectedPath), expectedContents).should.equal(true);
      fs.readlinkSync(expectedPath).should.equal(inputPath);
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write streaming files to the right folder', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('655', 8);

    var contentStream = through.obj();
    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: contentStream,
      stat: {
        mode: expectedMode,
      },
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(__dirname, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(true);
      bufEqual(fs.readFileSync(expectedPath), expectedContents).should.equal(true);
      fs.readlinkSync(expectedPath).should.equal(inputPath);
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    setTimeout(function() {
      contentStream.write(expectedContents);
      contentStream.end();
    }, 100);
    stream.end();
  });

  it('should write directories to the right folder', function(done) {
    var inputPath = path.join(__dirname, './fixtures/wow');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/wow');
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('655', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: null,
      stat: {
        isDirectory: function() {
          return true;
        },
        mode: expectedMode,
      },
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(__dirname, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.readlinkSync(expectedPath).should.equal(inputPath);
      fs.lstatSync(expectedPath).isDirectory().should.equal(false);
      fs.statSync(expectedPath).isDirectory().should.equal(true);
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should use different modes for files and directories', function(done) {
    var inputBase = path.join(__dirname, './fixtures');
    var inputPath = path.join(__dirname, './fixtures/wow/suchempty');
    var expectedBase = path.join(__dirname, './out-fixtures/wow');
    var expectedDirMode = parseInt('755', 8);
    var expectedFileMode = parseInt('655', 8);

    var firstFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      stat: fs.statSync(inputPath),
    });

    var buffered = [];

    var onEnd = function() {
      realMode(fs.lstatSync(expectedBase).mode).should.equal(expectedDirMode);
      realMode(buffered[0].stat.mode).should.equal(expectedFileMode);
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', {
      cwd: __dirname,
      mode: expectedFileMode,
      dirMode: expectedDirMode,
    });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(firstFile);
    stream.end();
  });

  it('should change to the specified base', function(done) {
    var inputBase = path.join(__dirname, './fixtures');
    var inputPath = path.join(__dirname, './fixtures/wow/suchempty');

    var firstFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      stat: fs.statSync(inputPath),
    });

    var buffered = [];

    var onEnd = function() {
      buffered[0].base.should.equal(inputBase);
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', {
      cwd: __dirname,
      base: inputBase,
    });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(firstFile);
    stream.end();
  });

  it('should report IO errors', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('722', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: expectedMode,
      },
    });

    fs.mkdirSync(expectedBase);
    fs.chmodSync(expectedBase, 0);

    var stream = vfs.symlink('./out-fixtures/', { cwd: __dirname });
    stream.on('error', function(err) {
      err.code.should.equal('EACCES');
      done();
    });
    stream.write(expectedFile);
  });

  ['end', 'finish'].forEach(function(eventName) {
    it('should emit ' + eventName + ' event', function(done) {
      var srcPath = path.join(__dirname, './fixtures/test.coffee');
      var stream = vfs.symlink('./out-fixtures/', { cwd: __dirname });

      stream.on(eventName, function() {
        done();
      });

      var file = new File({
        path: srcPath,
        cwd: __dirname,
        contents: new Buffer('1234567890'),
      });

      stream.write(file);
      stream.end();
    });
  });
});
