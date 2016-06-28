'use strict';

var os = require('os');
var path = require('path');

var fs = require('graceful-fs');
var del = require('del');
var File = require('vinyl');
var expect = require('expect');

var vfs = require('../');

function wipeOut() {
  this.timeout(20000);

  expect.restoreSpies();

  // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
  return del(path.join(__dirname, './out-fixtures/'));
}

var isWindows = (os.platform() === 'win32');

describe('.dest() with custom times', function() {
  beforeEach(wipeOut);
  afterEach(wipeOut);

  it('should not call futimes when no mtime is provided on the vinyl stat', function(done) {
    if (isWindows) {
      console.log('Changing the time of a directory errors in Windows.');
      console.log('Windows is treated as though it does not have permission to make this operation.');
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var earlier = Date.now() - 1001;

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {},
    });

    var onEnd = function() {
      var stats = fs.lstatSync(expectedPath);

      expect(futimesSpy.calls.length).toEqual(0);
      expect(stats.atime.getTime()).toBeGreaterThan(earlier);
      expect(stats.mtime.getTime()).toBeGreaterThan(earlier);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });

  it('should call futimes when an mtime is provided on the vinyl stat', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMtime = fs.lstatSync(inputPath).mtime;

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mtime: expectedMtime,
      },
    });

    var onEnd = function() {
      var stats = fs.lstatSync(expectedPath);

      expect(futimesSpy.calls.length).toEqual(1);
      expect(stats.mtime.getTime()).toEqual(expectedMtime.getTime());
      expect(expectedFile.stat.mtime).toEqual(expectedMtime);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });

  it('should not call futimes when provided mtime on the vinyl stat is invalid', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var earlier = Date.now() - 1001;

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mtime: new Date(undefined),
      },
    });

    var onEnd = function() {
      var stats = fs.lstatSync(expectedPath);

      expect(futimesSpy.calls.length).toEqual(0);
      expect(stats.mtime.getTime()).toBeGreaterThan(earlier);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });

  it('should call futimes when provided mtime on the vinyl stat is valid but provided atime is invalid', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMtime = fs.lstatSync(inputPath).mtime;
    var invalidAtime = new Date(undefined);

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        atime: invalidAtime,
        mtime: expectedMtime,
      },
    });

    var onEnd = function() {
      var stats = fs.lstatSync(expectedPath);

      expect(futimesSpy.calls.length).toEqual(1);
      expect(stats.mtime.getTime()).toEqual(expectedMtime.getTime());
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write file atime and mtime using the vinyl stat', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedAtime = fs.lstatSync(inputPath).atime;
    var expectedMtime = fs.lstatSync(inputPath).mtime;

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        atime: expectedAtime,
        mtime: expectedMtime,
      },
    });

    var onEnd = function() {
      var stats = fs.lstatSync(expectedPath);

      expect(stats.atime.getTime()).toEqual(expectedAtime.getTime());
      expect(stats.mtime.getTime()).toEqual(expectedMtime.getTime());
      expect(expectedFile.stat.mtime).toEqual(expectedMtime);
      expect(expectedFile.stat.atime).toEqual(expectedAtime);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });
});
