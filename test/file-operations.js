'use strict';

var expect = require('expect');

var os = require('os');
var fs = require('graceful-fs');
var del = require('del');
var path = require('path');
var File = require('vinyl');
var buffer = require('buffer');
var defaultResolution = require('default-resolution');

var fo = require('../lib/file-operations');
var constants = require('../lib/constants');

var mkdirp = fo.mkdirp;
var closeFd = fo.closeFd;
var isOwner = fo.isOwner;
var writeFile = fo.writeFile;
var getModeDiff = fo.getModeDiff;
var getTimesDiff = fo.getTimesDiff;
var getOwnerDiff = fo.getOwnerDiff;
var isValidUnixId = fo.isValidUnixId;
var updateMetadata = fo.updateMetadata;

var resolution = defaultResolution();

var DEFAULT_DIR_MODE = masked(constants.DEFAULT_DIR_MODE & ~process.umask()).toString(8);

function masked(mode) {
  return mode & constants.MASK_MODE;
}

function statHuman(filepath) {
  var stats = fs.lstatSync(filepath);
  return masked(stats.mode).toString(8);
}

function noop() {}

var isWindows = (os.platform() === 'win32');

describe('isOwner', function() {

  var ownerStat = {
    uid: 9001,
  };

  var nonOwnerStat = {
    uid: 9002,
  };

  var getuidSpy;
  var geteuidSpy;

  beforeEach(function(done) {
    if (typeof process.geteuid !== 'function') {
      process.geteuid = noop;
    }

    // Windows :(
    if (typeof process.getuid !== 'function') {
      process.getuid = noop;
    }

    getuidSpy = expect.spyOn(process, 'getuid').andReturn(ownerStat.uid);
    geteuidSpy = expect.spyOn(process, 'geteuid').andReturn(ownerStat.uid);

    done();
  });

  afterEach(function(done) {
    expect.restoreSpies();

    if (process.geteuid === noop) {
      delete process.geteuid;
    }

    // Windows :(
    if (process.getuid === noop) {
      delete process.getuid;
    }

    done();
  });

  // TODO: test for having neither

  it('uses process.geteuid() when available', function(done) {

    isOwner(ownerStat);

    expect(getuidSpy.calls.length).toEqual(0);
    expect(geteuidSpy.calls.length).toEqual(1);

    done();
  });

  it('uses process.getuid() when geteuid() is not available', function(done) {
    delete process.geteuid;

    isOwner(ownerStat);

    expect(getuidSpy.calls.length).toEqual(1);

    done();
  });

  it('returns false when non-root and non-owner', function(done) {
    var result = isOwner(nonOwnerStat);

    expect(result).toEqual(false);

    done();
  });

  it('returns true when owner and non-root', function(done) {
    var result = isOwner(ownerStat);

    expect(result).toEqual(true);

    done();
  });

  it('returns true when non-owner but root', function(done) {
    expect.spyOn(process, 'geteuid').andReturn(0); // 0 is root uid

    var result = isOwner(nonOwnerStat);

    expect(result).toEqual(true);

    done();
  });
});

describe('isValidUnixId', function() {

  it('returns true if the given id is a valid unix id', function(done) {
    var result = isValidUnixId(1000);

    expect(result).toEqual(true);

    done();
  });

  it('returns false if the given id is not a number', function(done) {
    var result = isValidUnixId('root');

    expect(result).toEqual(false);

    done();
  });

  it('returns false when the given id is less than 0', function(done) {
    var result = isValidUnixId(-1);

    expect(result).toEqual(false);

    done();
  });
});

describe('getModeDiff', function() {

  it('returns 0 if both modes are the same', function(done) {
    var fsMode = parseInt('777', 8);
    var vfsMode = parseInt('777', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result.toString(8)).toEqual('0');

    done();
  });

  it('returns 0 if vinyl mode is not a number', function(done) {
    var fsMode = parseInt('777', 8);
    var vfsMode = undefined;

    var result = getModeDiff(fsMode, vfsMode);

    expect(result.toString(8)).toEqual('0');

    done();
  });

  it('returns a value greater than 0 if modes are different', function(done) {
    var fsMode = parseInt('777', 8);
    var vfsMode = parseInt('744', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result.toString(8)).toEqual('33');

    done();
  });

  it('does not matter the order of diffing', function(done) {
    var fsMode = parseInt('655', 8);
    var vfsMode = parseInt('777', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result.toString(8)).toEqual('122');

    done();
  });

  it('includes the sticky/setuid/setgid bits', function(done) {
    var fsMode = parseInt('1777', 8);
    var vfsMode = parseInt('4777', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result.toString(8)).toEqual('5000');

    done();
  });
});

describe('getTimesDiff', function() {

  it('returns undefined if vinyl mtime is not a valid date', function(done) {
    var fsStat = {
      mtime: new Date(),
    };
    var vfsStat = {
      mtime: new Date(undefined),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  it('returns undefined if vinyl mtime & atime are both equal to counterparts', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  // TODO: is this proper/expected?
  it('returns undefined if vinyl mtimes equals the counterpart and atimes are null', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: null,
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: null,
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  it('returns a diff object if mtimes do not match', function(done) {
    var now = Date.now();
    var then = now - 1000;
    var fsStat = {
      mtime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(then),
    };
    var expected = {
      mtime: new Date(then),
      atime: undefined,
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('returns a diff object if atimes do not match', function(done) {
    var now = Date.now();
    var then = now - 1000;
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(then),
    };
    var expected = {
      mtime: new Date(now),
      atime: new Date(then),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('returns the fs atime if the vinyl atime is invalid', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(undefined),
    };
    var expected = {
      mtime: new Date(now),
      atime: new Date(now),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  // TODO: is this proper/expected?
  it('makes atime diff undefined if fs and vinyl atime are invalid', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(undefined),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(undefined),
    };
    var expected = {
      mtime: new Date(now),
      atime: undefined,
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });
});

describe('getOwnerDiff', function() {

  it('returns undefined if vinyl uid & gid are invalid', function(done) {
    var fsStat = {
      uid: 1000,
      gid: 1000,
    };
    var vfsStat = {
      uid: undefined,
      gid: undefined,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  it('returns undefined if vinyl uid & gid are both equal to counterparts', function(done) {
    var fsStat = {
      uid: 1000,
      gid: 1000,
    };
    var vfsStat = {
      uid: 1000,
      gid: 1000,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  it('returns a diff object if uid or gid do not match', function(done) {
    var fsStat = {
      uid: 1000,
      gid: 1000,
    };
    var vfsStat = {
      uid: 1001,
      gid: 1000,
    };
    var expected = {
      uid: 1001,
      gid: 1000,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    vfsStat = {
      uid: 1000,
      gid: 1001,
    };
    expected = {
      uid: 1000,
      gid: 1001,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('returns the fs uid if the vinyl uid is invalid', function(done) {
    var fsStat = {
      uid: 1000,
      gid: 1000,
    };
    var vfsStat = {
      uid: undefined,
      gid: 1001,
    };
    var expected = {
      uid: 1000,
      gid: 1001,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    var vfsStat = {
      uid: -1,
      gid: 1001,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('returns the fs gid if the vinyl gid is invalid', function(done) {
    var fsStat = {
      uid: 1000,
      gid: 1000,
    };
    var vfsStat = {
      uid: 1001,
      gid: undefined,
    };
    var expected = {
      uid: 1001,
      gid: 1000,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    var vfsStat = {
      uid: 1001,
      gid: -1,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('makes uid diff undefined if fs and vinyl uid are invalid', function(done) {
    var fsStat = {
      uid: undefined,
      gid: 1000,
    };
    var vfsStat = {
      uid: undefined,
      gid: 1001,
    };
    var expected = {
      uid: undefined,
      gid: 1001,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    var fsStat = {
      uid: -1,
      gid: 1000,
    };
    var vfsStat = {
      uid: -1,
      gid: 1001,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('makes gid diff undefined if fs and vinyl gid are invalid', function(done) {
    var fsStat = {
      uid: 1000,
      gid: undefined,
    };
    var vfsStat = {
      uid: 1001,
      gid: undefined,
    };
    var expected = {
      uid: 1001,
      gid: undefined,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    fsStat = {
      uid: 1000,
      gid: -1,
    };
    vfsStat = {
      uid: 1001,
      gid: -1,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

});

describe('closeFd', function() {

  it('calls the callback with propagated error if fd is not a number', function(done) {
    var propagatedError = new Error();

    closeFd(propagatedError, null, function(err) {
      expect(err).toEqual(propagatedError);

      done();
    });
  });

  it('calls the callback with close error if no error to propagate', function(done) {
    closeFd(null, -1, function(err) {
      expect(err).toExist();

      done();
    });
  });

  it('calls the callback with propagated error if close errors', function(done) {
    var propagatedError = new Error();

    closeFd(propagatedError, -1, function(err) {
      expect(err).toEqual(propagatedError);

      done();
    });
  });

  it('calls the callback with propagated error if close succeeds', function(done) {
    var propagatedError = new Error();

    var fd = fs.openSync(path.join(__dirname, './fixtures/test.coffee'), 'r');

    var spy = expect.spyOn(fs, 'close').andCallThrough();

    closeFd(propagatedError, fd, function(err) {
      spy.restore();

      expect(spy.calls.length).toEqual(1);
      expect(err).toEqual(propagatedError);

      done();
    });
  });

  it('calls the callback with no error if close succeeds & no propagated error', function(done) {
    var fd = fs.openSync(path.join(__dirname, './fixtures/test.coffee'), 'r');

    var spy = expect.spyOn(fs, 'close').andCallThrough();

    closeFd(null, fd, function(err) {
      spy.restore();

      expect(spy.calls.length).toEqual(1);
      expect(err).toEqual(undefined);

      done();
    });
  });
});

describe('writeFile', function() {

  var filepath;

  beforeEach(function(done) {
    filepath = path.join(__dirname, './fixtures/writeFile.txt');

    done();
  });

  afterEach(function() {
    // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
    return del(filepath);
  });

  it('writes a file to the filesystem, does not close and returns the fd', function(done) {
    var expected = 'test';
    var content = new Buffer(expected);

    writeFile(filepath, content, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, function() {
        var written = fs.readFileSync(filepath, 'utf-8');

        expect(written).toEqual(expected);

        done();
      });
    });
  });

  it('defaults to writing files with 0666 mode', function(done) {
    var expected = parseInt('0666', 8) & (~process.umask());
    var content = new Buffer('test');

    writeFile(filepath, content, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, function() {
        var stats = fs.lstatSync(filepath);

        expect(masked(stats.mode)).toEqual(expected);

        done();
      });
    });
  });

  it('accepts a different mode in options', function(done) {
    if (isWindows) {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var expected = parseInt('0777', 8) & (~process.umask());
    var content = new Buffer('test');
    var options = {
      mode: parseInt('0777', 8),
    };

    writeFile(filepath, content, options, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, function() {
        var stats = fs.lstatSync(filepath);

        expect(masked(stats.mode)).toEqual(expected);

        done();
      });
    });
  });

  it('defaults to opening files with write flag', function(done) {
    var content = new Buffer('test');

    writeFile(filepath, content, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.read(fd, new Buffer(4), 0, 4, 0, function(readErr) {
        expect(readErr).toExist();

        fs.close(fd, done);
      });
    });
  });

  it('accepts a different flag in options', function(done) {
    var expected = 'test';
    var content = new Buffer(expected);
    var options = {
      flag: 'w+',
    };

    writeFile(filepath, content, options, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.read(fd, new Buffer(4), 0, 4, 0, function(readErr, _, written) {
        expect(readErr).toNotExist();

        expect(written.toString()).toEqual(expected);

        fs.close(fd, done);
      });
    });
  });

  it('appends to a file if append flag is given', function(done) {
    var initial = 'test';
    var toWrite = '-a-thing';

    fs.writeFileSync(filepath, initial, 'utf-8');

    var expected = initial + toWrite;

    var content = new Buffer(toWrite);
    var options = {
      flag: 'a',
    };

    writeFile(filepath, content, options, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, function() {
        var written = fs.readFileSync(filepath, 'utf-8');

        expect(written).toEqual(expected);

        done();
      });
    });
  });

  it('does not pass a file descriptor if open call errors', function(done) {
    filepath = path.join(__dirname, './not-exist-dir/writeFile.txt');
    var content = new Buffer('test');

    writeFile(filepath, content, function(err, fd) {
      expect(err).toExist();
      expect(typeof fd === 'number').toEqual(false);

      done();
    });
  });

  it('passes a file descriptor if write call errors', function(done) {
    var existsFilepath = path.join(__dirname, './fixtures/test.coffee'); // File must exist
    var content = new Buffer('test');
    var options = {
      flag: 'r',
    };

    writeFile(existsFilepath, content, options, function(err, fd) {
      expect(err).toExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, done);
    });
  });

  it('passes an error if called with string as data', function(done) {
    writeFile(filepath, 'test', function(err) {
      expect(err).toExist();

      done();
    });
  });

  it('does not error on SlowBuffer', function(done) {
    if (!buffer.SlowBuffer) {
      this.skip();
      return;
    }

    var expected = 'test';
    var buf = new Buffer(expected);
    var content = new buffer.SlowBuffer(4);
    buf.copy(content, 0, 0, 4);

    writeFile(filepath, content, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, function() {
        var written = fs.readFileSync(filepath, 'utf-8');

        expect(written).toEqual(expected);

        done();
      });
    });
  });

  it('does not error if options is falsey', function(done) {
    var content = new Buffer('test');
    writeFile(filepath, content, null, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, done);
    });
  });
});

describe('updateMetadata', function() {

  var inputPath = path.join(__dirname, './fixtures/stats.txt');
  var file;

  beforeEach(function(done) {
    file = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
      stat: {

      },
    });

    done();
  });

  afterEach(function(done) {
    expect.restoreSpies();

    del.sync(inputPath);

    if (process.geteuid === noop) {
      delete process.geteuid;
    }

    done();
  });

  it('passes the error if fstat fails', function(done) {
    if (isWindows) {
      console.log('Changing the time of a directory errors in Windows.');
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      console.log('Windows is treated as though it does not have permission to make these operations.');
      this.skip();
      return;
    }

    var fd = 9001;

    updateMetadata(fd, file, function(err) {
      expect(err).toExist();

      done();
    });
  });

  it('updates the vinyl object with fs stats', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var fd = fs.openSync(inputPath, 'w+');
    var stats = fs.fstatSync(fd);

    updateMetadata(fd, file, function(err) {
      // Not sure why .toEqual doesn't match these
      Object.keys(file.stat).forEach(function(key) {
        expect(file.stat[key]).toEqual(stats[key]);
      });

      fs.close(fd, done);
    });
  });

  it('does not touch the fs if nothing to update', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var fchmodSpy = expect.spyOn(fs, 'fchmod').andCallThrough();
    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var fd = fs.openSync(inputPath, 'w+');

    updateMetadata(fd, file, function(err) {
      expect(fchmodSpy.calls.length).toEqual(0);
      expect(futimesSpy.calls.length).toEqual(0);

      fs.close(fd, done);
    });
  });

  it('does not touch the fs if process is not owner of the file', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    if (typeof process.geteuid !== 'function') {
      process.geteuid = noop;
    }

    expect.spyOn(process, 'geteuid').andReturn(9002);
    var fchmodSpy = expect.spyOn(fs, 'fchmod').andCallThrough();
    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    file.stat.mtime = new Date(Date.now() - 1000);

    var fd = fs.openSync(inputPath, 'w+');

    updateMetadata(fd, file, function(err) {
      expect(fchmodSpy.calls.length).toEqual(0);
      expect(futimesSpy.calls.length).toEqual(0);

      fs.close(fd, done);
    });
  });

  it('updates times on fs and vinyl object if there is a diff', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var now = Date.now();
    var then = now - 1000;
    file.stat.mtime = new Date(then);
    file.stat.atime = new Date(then);

    var fd = fs.openSync(inputPath, 'w+');

    updateMetadata(fd, file, function(err) {
      expect(futimesSpy.calls.length).toEqual(1);
      var stats = fs.fstatSync(fd);
      var mtimeMs = Date.parse(file.stat.mtime);
      var mtime = resolution ? mtimeMs - (mtimeMs % resolution) : mtimeMs;
      var atimeMs = Date.parse(file.stat.atime);
      var atime = resolution ? atimeMs - (atimeMs % resolution) : atimeMs;
      expect(file.stat.mtime).toEqual(new Date(then));
      expect(mtime).toEqual(Date.parse(stats.mtime));
      expect(file.stat.atime).toEqual(new Date(then));
      expect(atime).toEqual(Date.parse(stats.atime));

      fs.close(fd, done);
    });
  });

  it('forwards futimes error and descriptor upon error', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var futimesSpy = expect.spyOn(fs, 'futimes').andCall(function(fd, atime, mtime, cb) {
      cb(new Error('mocked error'));
    });

    var now = Date.now();
    var then = now - 1000;
    file.stat.mtime = new Date(then);
    file.stat.atime = new Date(then);

    var fd = fs.openSync(inputPath, 'w+');
    expect(typeof fd === 'number').toEqual(true);

    updateMetadata(fd, file, function(err) {
      expect(err).toExist();
      expect(futimesSpy.calls.length).toEqual(1);

      fs.close(fd, done);
    });
  });

  it('updates the mode on fs and vinyl object if there is a diff', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var fchmodSpy = expect.spyOn(fs, 'fchmod').andCallThrough();

    var mode = parseInt('777', 8);
    file.stat.mode = mode;

    var fd = fs.openSync(inputPath, 'w+');

    updateMetadata(fd, file, function(err) {
      expect(fchmodSpy.calls.length).toEqual(1);
      var stats = fs.fstatSync(fd);
      expect(file.stat.mode).toEqual(stats.mode);

      fs.close(fd, done);
    });
  });


  it('updates the sticky bit on mode on fs and vinyl object if there is a diff', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var fchmodSpy = expect.spyOn(fs, 'fchmod').andCallThrough();

    var mode = parseInt('1777', 8);
    file.stat.mode = mode;

    var fd = fs.openSync(inputPath, 'w+');

    updateMetadata(fd, file, function(err) {
      expect(fchmodSpy.calls.length).toEqual(1);
      var stats = fs.fstatSync(fd);
      expect(file.stat.mode).toEqual(stats.mode);

      fs.close(fd, done);
    });
  });

  it('forwards fchmod error and descriptor upon error', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = parseInt('777', 8);
    file.stat.mode = mode;

    var fd = fs.openSync(inputPath, 'w+');

    var fchmodSpy = expect.spyOn(fs, 'fchmod').andCall(function(fd, mode, cb) {
      cb(new Error('mocked error'));
    });

    updateMetadata(fd, file, function(err) {
      expect(err).toExist();
      expect(fchmodSpy.calls.length).toEqual(1);

      fs.close(fd, done);
    });
  });

  it('updates the mode & times on fs and vinyl object if there is a diff', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var fchmodSpy = expect.spyOn(fs, 'fchmod').andCallThrough();
    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var mode = parseInt('777', 8);
    file.stat.mode = mode;

    var now = Date.now();
    var then = now - 1000;
    file.stat.mtime = new Date(then);
    file.stat.atime = new Date(then);

    var fd = fs.openSync(inputPath, 'w+');

    updateMetadata(fd, file, function(err) {
      expect(fchmodSpy.calls.length).toEqual(1);
      expect(futimesSpy.calls.length).toEqual(1);

      var stats = fs.fstatSync(fd);
      var mtimeMs = Date.parse(file.stat.mtime);
      var mtime = resolution ? mtimeMs - (mtimeMs % resolution) : mtimeMs;
      var atimeMs = Date.parse(file.stat.atime);
      var atime = resolution ? atimeMs - (atimeMs % resolution) : atimeMs;

      expect(file.stat.mtime).toEqual(new Date(then));
      expect(mtime).toEqual(Date.parse(stats.mtime));
      expect(file.stat.atime).toEqual(new Date(then));
      expect(atime).toEqual(Date.parse(stats.atime));
      expect(file.stat.mode).toEqual(stats.mode);

      fs.close(fd, done);
    });
  });

  it('forwards fchmod error and descriptor through futimes if there is a time diff', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var expectedErr = new Error('mocked error');

    var fchmodSpy = expect.spyOn(fs, 'fchmod').andCall(function(fd, mode, cb) {
      cb(expectedErr);
    });
    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var mode = parseInt('777', 8);
    file.stat.mode = mode;

    var now = Date.now();
    var then = now - 1000;
    file.stat.mtime = new Date(then);
    file.stat.atime = new Date(then);

    var fd = fs.openSync(inputPath, 'w');

    updateMetadata(fd, file, function(err) {
      expect(err).toExist();
      expect(err).toEqual(expectedErr);
      expect(fchmodSpy.calls.length).toEqual(1);
      expect(futimesSpy.calls.length).toEqual(1);

      fs.close(fd, done);
    });
  });
});

describe('mkdirp', function() {

  var fixtures = path.join(__dirname, './fixtures');
  var dir = path.join(fixtures, './bar');

  beforeEach(function(done) {
    // Linux inherits the setgid of the directory and it messes up our assertions
    // So we explixitly set the mode to 777 before each test
    fs.chmod(fixtures, '777', done);
  });

  afterEach(function() {
    return del(dir);
  });

  it('makes a single directory', function(done) {
    mkdirp(dir, function(err) {
      expect(err).toNotExist();
      expect(statHuman(dir)).toExist();

      done();
    });
  });

  it('makes single directory w/ default mode', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    mkdirp(dir, function(err) {
      expect(err).toNotExist();
      expect(statHuman(dir)).toEqual(DEFAULT_DIR_MODE);

      done();
    });
  });

  it('makes multiple directories', function(done) {
    var nestedDir = path.join(dir, './baz/foo');
    mkdirp(nestedDir, function(err) {
      expect(err).toNotExist();
      expect(statHuman(nestedDir)).toExist();

      done();
    });
  });

  it('makes multiple directories w/ default mode', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var nestedDir = path.join(dir, './baz/foo');
    mkdirp(nestedDir, function(err) {
      expect(err).toNotExist();
      expect(statHuman(nestedDir)).toEqual(DEFAULT_DIR_MODE);

      done();
    });
  });

  it('makes directory with custom mode', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = parseInt('0700', 8);
    mkdirp(dir, mode, function(err) {
      expect(err).toNotExist();
      expect(statHuman(dir)).toEqual(masked(mode).toString(8));

      done();
    });
  });

  it('can create a directory with setgid permission', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = parseInt('2700', 8);
    mkdirp(dir, mode, function(err) {
      expect(err).toNotExist();
      expect(statHuman(dir)).toEqual(masked(mode).toString(8));

      done();
    });
  });

  it('does not change directory mode if exists and no mode given', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = parseInt('0700', 8);
    mkdirp(dir, mode, function(err) {
      expect(err).toNotExist();

      mkdirp(dir, function(err2) {
        expect(err2).toNotExist();
        expect(statHuman(dir)).toEqual(masked(mode).toString(8));

        done();
      });
    });
  });

  it('makes multiple directories with custom mode', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var nestedDir = path.join(dir, './baz/foo');
    var mode = parseInt('0700',8);
    mkdirp(nestedDir, mode, function(err) {
      expect(err).toNotExist();
      expect(statHuman(nestedDir)).toEqual(masked(mode).toString(8));

      done();
    });
  });

  it('uses default mode on intermediate directories', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var intermediateDir = path.join(dir, './baz');
    var nestedDir = path.join(intermediateDir, './foo');
    var mode = parseInt('0700',8);
    mkdirp(nestedDir, mode, function(err) {
      expect(err).toNotExist();
      expect(statHuman(dir)).toEqual(DEFAULT_DIR_MODE);
      expect(statHuman(intermediateDir)).toEqual(DEFAULT_DIR_MODE);

      done();
    });
  });

  it('changes mode of existing directory', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = parseInt('0700',8);
    mkdirp(dir, function(err) {
      expect(err).toNotExist();
      expect(statHuman(dir)).toEqual(DEFAULT_DIR_MODE);

      mkdirp(dir, mode, function(err2) {
        expect(err2).toNotExist();
        expect(statHuman(dir)).toEqual(masked(mode).toString(8));

        done();
      });
    });
  });

  it('errors with EEXIST if file in path', function(done) {
    var file = path.join(dir, './bar.txt');
    mkdirp(dir, function(err) {
      expect(err).toNotExist();

      fs.writeFile(file, 'hello world', function(err2) {
        expect(err2).toNotExist();

        mkdirp(file, function(err3) {
          expect(err3).toExist();
          expect(err3.code).toEqual('EEXIST');

          done();
        });
      });
    });
  });

  it('does not change mode of existing file', function(done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var file = path.join(dir, './bar.txt');
    var mode = parseInt('0700', 8);
    mkdirp(dir, function(err) {
      expect(err).toNotExist();

      fs.writeFile(file, 'hello world', function(err2) {
        expect(err2).toNotExist();

        var expectedMode = statHuman(file);

        mkdirp(file, mode, function(err3) {
          expect(err3).toExist();
          expect(statHuman(file)).toEqual(expectedMode);

          done();
        });
      });
    });
  });
});
