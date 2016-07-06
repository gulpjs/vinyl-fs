'use strict';

var spies = require('./spy');
var chmodSpy = spies.chmodSpy;
var statSpy = spies.statSpy;

var vfs = require('../');

var os = require('os');
var path = require('path');
var fs = require('graceful-fs');
var del = require('del');

var bufEqual = require('buffer-equal');
var through = require('through2');
var assign = require('object-assign');
var File = require('vinyl');

var should = require('should');
require('mocha');

function wipeOut() {
  spies.setError('false');
  statSpy.reset();
  chmodSpy.reset();

  return del(path.join(__dirname, './out-fixtures/'));
}

var dataWrap = function(fn) {
  return function(data, enc, cb) {
    fn(data);
    cb();
  };
};

var realMode = function(n) {
  return n & parseInt('777', 8);
};

var isWindows = (os.platform() === 'win32');

describe('symlink stream', function() {
  beforeEach(wipeOut);
  afterEach(wipeOut);

  it.skip('should explode on invalid folder', function(done) {
    var stream;
    try {
      stream = vfs.symlink();
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
    var expectedMode = parseInt('677', 8)  & ~process.umask();

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
      fs.readlinkSync(expectedPath).should.equal(path.join(__dirname, './fixtures/test.coffee'));
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', assign({ cwd: __dirname }, {}));

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write buffer files to the right folder relatively', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('677', 8)  & ~process.umask();

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
      fs.readlinkSync(expectedPath).should.equal(path.join('..', 'fixtures', 'test.coffee'));
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', assign({ cwd: __dirname }, { relative: true }));

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
    var expectedMode = parseInt('677', 8) & ~process.umask();

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
    var expectedMode = parseInt('677', 8) & ~process.umask();

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
      fs.readlinkSync(expectedPath).should.equal(path.join(__dirname, './fixtures/wow'));
      fs.lstatSync(expectedPath).isDirectory().should.equal(false);
      fs.statSync(expectedPath).isDirectory().should.equal(true);
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', assign({ cwd: __dirname }, {}));

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write directories to the right folder relatively', function(done) {
    var inputPath = path.join(__dirname, './fixtures/wow');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/wow');
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('677', 8) & ~process.umask();

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
      fs.readlinkSync(expectedPath).should.equal(path.join('..', 'fixtures', 'wow'));
      fs.lstatSync(expectedPath).isDirectory().should.equal(false);
      fs.statSync(expectedPath).isDirectory().should.equal(true);
      done();
    };

    var stream = vfs.symlink('./out-fixtures/', assign({ cwd: __dirname }, { relative: true }));

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should use different modes for files and directories', function(done) {
    if (isWindows) {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var inputBase = path.join(__dirname, './fixtures');
    var inputPath = path.join(__dirname, './fixtures/wow/suchempty');
    var expectedBase = path.join(__dirname, './out-fixtures/wow');
    var expectedDirMode = parseInt('777', 8) & ~process.umask();
    var expectedFileMode = parseInt('677', 8) & ~process.umask();

    var firstFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      stat: fs.statSync(inputPath),
    });

    var buffered = [];

    var onEnd = function() {
      realMode(fs.lstatSync(expectedBase).mode).toString(8).should.equal(expectedDirMode.toString(8));
      realMode(buffered[0].stat.mode).toString(8).should.equal(expectedFileMode.toString(8));
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

  it('should report IO errors', function(done) {
    if (isWindows) {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      console.log('This test is skipped on Windows because we have to chmod the file to 0.');
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
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

  it('should pass options to through2', function(done) {
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var content = fs.readFileSync(srcPath);
    var stream = vfs.symlink('./out-fixtures/', { cwd: __dirname, objectMode: false });

    stream.on('error', function(err) {
      err.should.match(/Invalid non-string\/buffer chunk/);
      done();
    });

    var file = new File({
      path: srcPath,
      cwd: __dirname,
      contents: content,
    });

    stream.write(file);
    stream.end();
  });

});
