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

describe('.dest() with custom owner', function() {
  beforeEach(wipeOut);
  afterEach(wipeOut);

  it('should call fchown when the uid and/or gid are provided on the vinyl stat', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);

    var fchownSpy = expect.spyOn(fs, 'fchown').andCallThrough();

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        uid: 1001,
        gid: 1001,
      },
    });

    var onEnd = function() {
      expect(fchownSpy.calls.length).toEqual(1);
      expect(fchownSpy.calls[0].arguments[1]).toEqual(1001);
      expect(fchownSpy.calls[0].arguments[2]).toEqual(1001);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });

  it('should not call fchown when the uid and gid provided on the vinyl stat are invalid', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);

    var fchownSpy = expect.spyOn(fs, 'fchown').andCallThrough();

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        uid: -1,
        gid: -1,
      },
    });

    var onEnd = function() {
      expect(fchownSpy.calls.length).toEqual(0);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });
});
