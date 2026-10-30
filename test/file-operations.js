"use strict";

var path = require("node:path");
var buffer = require("node:buffer");
var assert = require("node:assert");
var { afterEach, beforeEach, describe, it } = require("node:test");

var fs = require("graceful-fs");
var File = require("vinyl");

var mkdirp = require("fs-mkdirp-stream/mkdirp");

var fo = require("../lib/file-operations");
var constants = require("../lib/constants");

var DEFAULT_FILE_MODE = constants.DEFAULT_FILE_MODE;

var cleanup = require("./utils/cleanup");
var statMode = require("./utils/stat-mode");
var mockError = require("./utils/mock-error");
var isWindows = require("./utils/is-windows");
var applyUmask = require("./utils/apply-umask");
var testStreams = require("./utils/test-streams");
var testConstants = require("./utils/test-constants");
var describeStreams = require("./utils/suite");

var closeFd = fo.closeFd;
var isOwner = fo.isOwner;
var writeFile = fo.writeFile;
var getModeDiff = fo.getModeDiff;
var getTimesDiff = fo.getTimesDiff;
var getOwnerDiff = fo.getOwnerDiff;
var isValidUnixId = fo.isValidUnixId;
var getFlags = fo.getFlags;
var isFatalOverwriteError = fo.isFatalOverwriteError;
var isFatalUnlinkError = fo.isFatalUnlinkError;
var reflectStat = fo.reflectStat;
var reflectLinkStat = fo.reflectLinkStat;
var updateMetadata = fo.updateMetadata;
var createWriteStream = fo.createWriteStream;

var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var neInputDirpath = testConstants.neInputDirpath;
var outputPath = testConstants.outputPath;
var symlinkPath = testConstants.symlinkDirpath;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

function noop() {}

describe("isOwner", function () {
  var ownerStat = {
    uid: 9001,
  };

  var nonOwnerStat = {
    uid: 9002,
  };

  // TODO: test for having neither
  // TODO something is funky with how these methods interact if we do not mock gateuid later tests will fail most likely something gets overwritten in the chain.
  it("uses process.geteuid() when available", function (t) {
    var getuidSpy = t.mock.method(process, "getuid", () => ownerStat.uid);
    var geteuidSpy = t.mock.method(process, "geteuid", () => ownerStat.uid);

    isOwner(ownerStat);

    assert.strictEqual(getuidSpy.mock.callCount(), 0);
    assert.strictEqual(geteuidSpy.mock.callCount(), 1);
  });

  it("uses process.getuid() when geteuid() is not available", function (t) {
    var getuidSpy = t.mock.method(process, "getuid", () => ownerStat.uid);
    // TODO why will this cause fs methods to fail in updateMetadata if not mocked
    t.mock.method(process, "geteuid", () => ownerStat.uid);

    delete process.geteuid;

    isOwner(ownerStat);

    assert.strictEqual(getuidSpy.mock.callCount(), 1);
  });

  it("returns false when non-root and non-owner", function () {
    var result = isOwner(nonOwnerStat);

    assert.strictEqual(result, false);
  });

  it("returns true when owner and non-root", function (t) {
    t.mock.method(process, "geteuid", () => ownerStat.uid);
    var result = isOwner(ownerStat);

    assert.strictEqual(result, true);
  });

  it("returns true when non-owner but root", function (t) {
    var spy = t.mock.method(process, "geteuid", () => 0);

    var result = isOwner(nonOwnerStat);

    assert.strictEqual(result, true);
    assert.strictEqual(spy.mock.callCount(), 1);
  });
});

describe("isValidUnixId", function () {
  it("returns true if the given id is a valid unix id", function () {
    var result = isValidUnixId(1000);

    assert.strictEqual(result, true);
  });

  it("returns false if the given id is not a number", function () {
    var result = isValidUnixId("root");

    assert.strictEqual(result, false);
  });

  it("returns false when the given id is less than 0", function () {
    var result = isValidUnixId(-1);

    assert.strictEqual(result, false);
  });
});

describe("getFlags", function () {
  it("returns wx if overwrite is false and append is false", function () {
    var result = getFlags({
      overwrite: false,
      append: false,
    });

    assert.strictEqual(result, "wx");
  });

  it("returns w if overwrite is true and append is false", function () {
    var result = getFlags({
      overwrite: true,
      append: false,
    });

    assert.strictEqual(result, "w");
  });

  it("returns ax if overwrite is false and append is true", function () {
    var result = getFlags({
      overwrite: false,
      append: true,
    });

    assert.strictEqual(result, "ax");
  });

  it("returns a if overwrite is true and append is true", function () {
    var result = getFlags({
      overwrite: true,
      append: true,
    });

    assert.strictEqual(result, "a");
  });
});

describe("isFatalOverwriteError", function () {
  it("returns false if not given any error", function () {
    var result = isFatalOverwriteError(null);

    assert.strictEqual(result, false);
  });

  it("returns true if code != EEXIST", function () {
    var result = isFatalOverwriteError({ code: "EOTHER" });

    assert.strictEqual(result, true);
  });

  it("returns false if code == EEXIST and flags == wx", function () {
    var result = isFatalOverwriteError({ code: "EEXIST" }, "wx");

    assert.strictEqual(result, false);
  });

  it("returns false if code == EEXIST and flags == ax", function () {
    var result = isFatalOverwriteError({ code: "EEXIST" }, "ax");

    assert.strictEqual(result, false);
  });

  it("returns true if error.code == EEXIST and flags == w", function () {
    var result = isFatalOverwriteError({ code: "EEXIST" }, "w");

    assert.strictEqual(result, true);
  });

  it("returns true if error.code == EEXIST and flags == a", function () {
    var result = isFatalOverwriteError({ code: "EEXIST" }, "a");

    assert.strictEqual(result, true);
  });
});

describe("isFatalUnlinkError", function () {
  it("returns false if not given any error", function () {
    var result = isFatalUnlinkError(null);

    assert.strictEqual(result, false);
  });

  it("returns false if code == ENOENT", function () {
    var result = isFatalUnlinkError({ code: "ENOENT" }, "wx");

    assert.strictEqual(result, false);
  });

  it("returns true if code != ENOENT", function () {
    var result = isFatalUnlinkError({ code: "EOTHER" });

    assert.strictEqual(result, true);
  });
});

describe("getModeDiff", function () {
  it("returns 0 if both modes are the same", function () {
    var fsMode = applyUmask("777");
    var vfsMode = applyUmask("777");

    var result = getModeDiff(fsMode, vfsMode);

    assert.strictEqual(result, 0);
  });

  it("returns 0 if vinyl mode is not a number", function () {
    var fsMode = applyUmask("777");
    var vfsMode = undefined;

    var result = getModeDiff(fsMode, vfsMode);

    assert.strictEqual(result, 0);
  });

  it("returns a value greater than 0 if modes are different", function () {
    var fsMode = applyUmask("777");
    var vfsMode = applyUmask("744");

    var result = getModeDiff(fsMode, vfsMode);

    assert.strictEqual(result > 0, true);
  });

  it("returns the proper diff", function () {
    var fsMode = applyUmask("777");
    var vfsMode = applyUmask("744");
    var expectedDiff = applyUmask("33");

    var result = getModeDiff(fsMode, vfsMode);

    assert.strictEqual(result, expectedDiff);
  });

  it("does not matter the order of diffing", function () {
    var fsMode = applyUmask("655");
    var vfsMode = applyUmask("777");
    var expectedDiff = applyUmask("122");

    var result = getModeDiff(fsMode, vfsMode);

    assert.strictEqual(result, expectedDiff);
  });

  it("includes the sticky/setuid/setgid bits", function () {
    var fsMode = applyUmask("1777");
    var vfsMode = applyUmask("4777");
    var expectedDiff = applyUmask("5000");

    var result = getModeDiff(fsMode, vfsMode);

    assert.strictEqual(result, expectedDiff);
  });
});

describe("getTimesDiff", function () {
  it("returns undefined if vinyl mtime is not a valid date", function () {
    var fsStat = {
      mtime: new Date(),
    };
    var vfsStat = {
      mtime: new Date(undefined),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    assert.strictEqual(result, undefined);
  });

  it("returns undefined if vinyl mtime & atime are both equal to counterparts", function () {
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

    assert.strictEqual(result, undefined);
  });

  // TODO: is this proper/expected?
  it("returns undefined if vinyl mtimes equals the counterpart and atimes are null", function () {
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

    assert.strictEqual(result, undefined);
  });

  it("returns a diff object if mtimes do not match", function () {
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

    assert.deepStrictEqual(result, expected);
  });

  it("returns a diff object if atimes do not match", function () {
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

    assert.deepStrictEqual(result, expected);
  });

  it("returns the fs atime if the vinyl atime is invalid", function () {
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

    assert.deepStrictEqual(result, expected);
  });

  // TODO: is this proper/expected?
  it("makes atime diff undefined if fs and vinyl atime are invalid", function () {
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

    assert.deepStrictEqual(result, expected);
  });
});

describe("getOwnerDiff", function () {
  it("returns undefined if vinyl uid & gid are invalid", function () {
    var fsStat = {
      uid: 1000,
      gid: 1000,
    };
    var vfsStat = {
      uid: undefined,
      gid: undefined,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    assert.strictEqual(result, undefined);
  });

  it("returns undefined if vinyl uid & gid are both equal to counterparts", function () {
    var fsStat = {
      uid: 1000,
      gid: 1000,
    };
    var vfsStat = {
      uid: 1000,
      gid: 1000,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    assert.strictEqual(result, undefined);
  });

  it("returns a diff object if uid or gid do not match", function () {
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

    assert.deepStrictEqual(result, expected);

    vfsStat = {
      uid: 1000,
      gid: 1001,
    };
    expected = {
      uid: 1000,
      gid: 1001,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    assert.deepStrictEqual(result, expected);
  });

  it("returns the fs uid if the vinyl uid is invalid", function () {
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

    assert.deepStrictEqual(result, expected);

    vfsStat = {
      uid: -1,
      gid: 1001,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    assert.deepStrictEqual(result, expected);
  });

  it("returns the fs gid if the vinyl gid is invalid", function () {
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

    assert.deepStrictEqual(result, expected);

    vfsStat = {
      uid: 1001,
      gid: -1,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    assert.deepStrictEqual(result, expected);
  });

  it("returns undefined if fs and vinyl uid are invalid", function () {
    var fsStat = {
      uid: undefined,
      gid: 1000,
    };
    var vfsStat = {
      uid: undefined,
      gid: 1001,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    assert.strictEqual(result, undefined);

    fsStat = {
      uid: -1,
      gid: 1000,
    };
    vfsStat = {
      uid: -1,
      gid: 1001,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    assert.strictEqual(result, undefined);
  });

  it("returns undefined if fs and vinyl gid are invalid", function () {
    var fsStat = {
      uid: 1000,
      gid: undefined,
    };
    var vfsStat = {
      uid: 1001,
      gid: undefined,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    assert.strictEqual(result, undefined);

    fsStat = {
      uid: 1000,
      gid: -1,
    };
    vfsStat = {
      uid: 1001,
      gid: -1,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    assert.strictEqual(result, undefined);
  });
});

describe("closeFd", function () {
  // This is just a very large number since node broke our tests by disallowing -1
  // We're also doing some hacky version matching because node 0.12 accepts 10000 on Windows (and fails the test)
  var invalidFd = process.version[1] === "0" ? -1 : 10000;

  it("calls the callback with propagated error if fd is not a number", function (t, done) {
    var propagatedError = new Error();

    closeFd(propagatedError, null, function (err) {
      assert.strictEqual(err, propagatedError);

      done();
    });
  });

  it("calls the callback with close error if no error to propagate", function (t, done) {
    closeFd(null, invalidFd, function (err) {
      assert.ok(err != null);

      done();
    });
  });

  it("calls the callback with propagated error if close errors", function (t, done) {
    var propagatedError = new Error();

    closeFd(propagatedError, invalidFd, function (err) {
      assert.strictEqual(err, propagatedError);

      done();
    });
  });

  it("calls the callback with propagated error if close succeeds", function (t, done) {
    var propagatedError = new Error();

    var fd = fs.openSync(inputPath, "r");

    var closeSpy = t.mock.method(fs, "close");

    closeFd(propagatedError, fd, function (err) {
      assert.strictEqual(closeSpy.mock.callCount(), 1);
      assert.strictEqual(err, propagatedError);

      done();
    });
  });

  it("calls the callback with no error if close succeeds & no propagated error", function (t, done) {
    var fd = fs.openSync(inputPath, "r");

    var spy = t.mock.method(fs, "close");

    closeFd(null, fd, function (err) {
      assert.strictEqual(spy.mock.callCount(), 1);
      assert.strictEqual(err, undefined);

      done();
    });
  });
});

describe("writeFile", function () {
  beforeEach(clean);
  afterEach(clean);

  beforeEach(function (t, done) {
    mkdirp(outputBase, done);
  });

  it("writes a file to the filesystem, does not close and returns the fd", function (t, done) {
    writeFile(outputPath, Buffer.from(contents), function (err, fd) {
      assert.ifError(err);
      assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, function () {
        var written = fs.readFileSync(outputPath, "utf8");

        assert.strictEqual(written, contents);

        done();
      });
    });
  });

  it("defaults to writing files with 0666 mode", function (t, done) {
    var expected = applyUmask("666");

    writeFile(outputPath, Buffer.from(contents), function (err, fd) {
      assert.ifError(err);
      assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, function () {
        assert.strictEqual(statMode(outputPath), expected);

        done();
      });
    });
  });

  // Changing the mode of a file is not supported by node.js in Windows.
  it(
    "accepts a different mode in options",
    { skip: isWindows },
    function (t, done) {
      var expected = applyUmask("777");
      var options = {
        mode: expected,
      };

      writeFile(outputPath, Buffer.from(contents), options, function (err, fd) {
        assert.ifError(err);
        assert.strictEqual(typeof fd === "number", true);

        fs.close(fd, function () {
          assert.strictEqual(statMode(outputPath), expected);

          done();
        });
      });
    },
  );

  it("defaults to opening files with write flag", function (t, done) {
    var length = contents.length;

    writeFile(outputPath, Buffer.from(contents), function (err, fd) {
      assert.ifError(err);
      assert.strictEqual(typeof fd === "number", true);

      fs.read(fd, Buffer.alloc(length), 0, length, 0, function (readErr) {
        assert.ok(readErr != null);

        fs.close(fd, done);
      });
    });
  });

  it("accepts a different flags in options", function (t, done) {
    var length = contents.length;
    var options = {
      flags: "w+",
    };

    writeFile(outputPath, Buffer.from(contents), options, function (err, fd) {
      assert.ifError(err);
      assert.strictEqual(typeof fd === "number", true);

      fs.read(
        fd,
        Buffer.alloc(length),
        0,
        length,
        0,
        function (readErr, _, written) {
          assert.ifError(readErr);

          assert.strictEqual(written.toString(), contents);

          fs.close(fd, done);
        },
      );
    });
  });

  it("appends to a file if append flag is given", function (t, done) {
    var initial = "test";
    var toWrite = "-a-thing";

    fs.writeFileSync(outputPath, initial, "utf8");

    var expected = initial + toWrite;

    var options = {
      flags: "a",
    };

    writeFile(outputPath, Buffer.from(toWrite), options, function (err, fd) {
      assert.ifError(err);
      assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, function () {
        var written = fs.readFileSync(outputPath, "utf8");

        assert.strictEqual(written, expected);

        done();
      });
    });
  });

  it("does not pass a file descriptor if open call errors", function (t, done) {
    var notExistDir = path.join(__dirname, "./not-exist-dir/writeFile.txt");

    writeFile(notExistDir, Buffer.from(contents), function (err, fd) {
      assert.ok(err != null);
      assert.strictEqual(typeof fd === "number", false);

      done();
    });
  });

  it("passes a file descriptor if write call errors", function (t, done) {
    var options = {
      flags: "r",
    };

    writeFile(inputPath, Buffer.from(contents), options, function (err, fd) {
      assert.ok(err != null);
      assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, done);
    });
  });

  it("passes an error if called with string as data", function (t, done) {
    writeFile(outputPath, contents, function (err) {
      assert.ok(err != null);

      done();
    });
  });

  it(
    "does not error on SlowBuffer",
    { skip: !buffer.SlowBuffer },
    function (t, done) {
      var length = contents.length;
      var buf = Buffer.from(contents);
      var content = new buffer.SlowBuffer(length);
      buf.copy(content, 0, 0, length);

      writeFile(outputPath, content, function (err, fd) {
        assert.ifError(err);
        assert.strictEqual(typeof fd === "number", true);

        fs.close(fd, function () {
          var written = fs.readFileSync(outputPath, "utf8");

          assert.strictEqual(written, contents);

          done();
        });
      });
    },
  );

  it("does not error if options is falsey", function (t, done) {
    writeFile(outputPath, Buffer.from(contents), null, function (err, fd) {
      assert.ifError(err);
      assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, done);
    });
  });
});

describe("reflectStat", function () {
  beforeEach(clean);
  afterEach(clean);

  beforeEach(function (t, done) {
    mkdirp(outputBase, done);
  });

  it("passes the error if stat fails", function (t, done) {
    var file = new File();

    reflectStat(neInputDirpath, file, function (err) {
      assert.ok(err != null);

      done();
    });
  });

  it("updates the vinyl with filesystem stats", function (t, done) {
    var file = new File();

    fs.symlinkSync(inputPath, symlinkPath);

    reflectStat(symlinkPath, file, function () {
      // There appears to be a bug in the Windows implementation which causes
      // the sync versions of stat and lstat to return unsigned 32-bit ints
      // whilst the async versions returns signed 32-bit ints... This affects
      // dev but possibly others as well?
      fs.stat(symlinkPath, function (err, stat) {
        assert.deepStrictEqual(file.stat, stat);

        done();
      });
    });
  });
});

describe("reflectLinkStat", function () {
  beforeEach(clean);
  afterEach(clean);

  beforeEach(function (t, done) {
    mkdirp(outputBase, done);
  });

  it("passes the error if lstat fails", function (t, done) {
    var file = new File();

    reflectLinkStat(neInputDirpath, file, function (err) {
      assert.ok(err != null);

      done();
    });
  });

  it("updates the vinyl with filesystem symbolic stats", function (t, done) {
    var file = new File();

    fs.symlinkSync(inputPath, symlinkPath);

    reflectLinkStat(symlinkPath, file, function () {
      // There appears to be a bug in the Windows implementation which causes
      // the sync versions of stat and lstat to return unsigned 32-bit ints
      // whilst the async versions returns signed 32-bit ints... This affects
      // dev but possibly others as well?
      fs.lstat(symlinkPath, function (err, stat) {
        assert.deepStrictEqual(file.stat, stat);

        done();
      });
    });
  });
});

describe("updateMetadata", function () {
  beforeEach(clean);
  afterEach(clean);

  beforeEach(function (t, done) {
    mkdirp(outputBase, done);
  });

  afterEach(function (t, done) {
    if (process.geteuid === noop) {
      delete process.geteuid;
    }

    done();
  });

  // Changing the time of a directory errors in Windows.
  // Changing the mode of a file is not supported by node.js in Windows.
  // Windows is treated as though it does not have permission to make these operations.
  it(
    "passes the error if fstat fails",
    { skip: isWindows },
    function (t, done) {
      var fd = 9001;

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {},
      });

      updateMetadata(fd, file, function (err) {
        assert.ok(err != null);

        done();
      });
    },
  );

  it(
    "updates the vinyl object with fs stats",
    { skip: isWindows },
    function (t, done) {
      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {},
      });

      var fd = fs.openSync(outputPath, "w+");
      var stats = fs.fstatSync(fd);

      updateMetadata(fd, file, function () {
        // Not sure why .toEqual doesn't match these
        Object.keys(file.stat).forEach(function (key) {
          assert.deepStrictEqual(file.stat[key], stats[key]);
        });

        fs.close(fd, done);
      });
    },
  );

  it(
    "does not touch the fs if nothing to update",
    { skip: isWindows },
    function (t, done) {
      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {},
      });

      var fchmodSpy = t.mock.method(fs, "fchmod");
      var futimesSpy = t.mock.method(fs, "futimes");

      var fd = fs.openSync(outputPath, "w+");

      updateMetadata(fd, file, function () {
        assert.strictEqual(fchmodSpy.mock.callCount(), 0);
        assert.strictEqual(futimesSpy.mock.callCount(), 0);

        fs.close(fd, done);
      });
    },
  );

  it(
    "does not touch the fs if process is not owner of the file",
    { skip: isWindows },
    function (t, done) {
      if (typeof process.geteuid !== "function") {
        process.geteuid = noop;
      }

      var earlier = Date.now() - 1000;

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {
          mtime: new Date(earlier),
        },
      });

      t.mock.method(process, "geteuid", () => 9002);
      var fchmodSpy = t.mock.method(fs, "fchmod");
      var futimesSpy = t.mock.method(fs, "futimes");

      var fd = fs.openSync(outputPath, "w+");

      updateMetadata(fd, file, function () {
        assert.strictEqual(fchmodSpy.mock.callCount(), 0);
        assert.strictEqual(futimesSpy.mock.callCount(), 0);

        fs.close(fd, done);
      });
    },
  );

  it(
    "updates times on fs and vinyl object if there is a diff",
    { skip: isWindows },
    function (t, done) {
      var futimesSpy = t.mock.method(fs, "futimes");

      // Use new atime/mtime
      var atime = new Date(Date.now() - 2048);
      var mtime = new Date(Date.now() - 1024);
      var mtimeEarlier = mtime.getTime() - 1000;
      var atimeEarlier = atime.getTime() - 1000;

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {
          mtime: new Date(mtimeEarlier),
          atime: new Date(atimeEarlier),
        },
      });

      var fd = fs.openSync(outputPath, "w+");

      updateMetadata(fd, file, function () {
        assert.strictEqual(futimesSpy.mock.callCount(), 1);
        // Var stats = fs.fstatSync(fd);
        var atimeSpy = futimesSpy.mock.calls[0].arguments[1];
        var mtimeSpy = futimesSpy.mock.calls[0].arguments[2];

        assert.deepStrictEqual(file.stat.mtime, new Date(mtimeEarlier));
        assert.deepStrictEqual(mtimeSpy.getTime(), mtimeEarlier);
        assert.deepStrictEqual(file.stat.atime, new Date(atimeEarlier));
        assert.deepStrictEqual(atimeSpy.getTime(), atimeEarlier);

        fs.close(fd, done);
      });
    },
  );

  it(
    "forwards futimes error and descriptor upon error",
    { skip: isWindows },
    function (t, done) {
      var futimesSpy = t.mock.method(fs, "futimes", (fd, atime, mtime, cb) => {
        process.nextTick(mockError, fd, atime, mtime, cb);
      });

      var now = Date.now();
      var then = now - 1000;

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {
          mtime: new Date(then),
          atime: new Date(then),
        },
      });

      var fd = fs.openSync(outputPath, "w+");
      assert.strictEqual(typeof fd === "number", true);

      updateMetadata(fd, file, function (err) {
        assert.ok(err != null);
        assert.strictEqual(futimesSpy.mock.callCount(), 1);

        fs.close(fd, done);
      });
    },
  );

  it(
    "sets stats to filesystem stats if futimes is not implemented (issue 302)",
    { skip: isWindows },
    function (t, done) {
      var futimesSpy = t.mock.method(
        fs,
        "futimes",
        function (fd, atime, mtime, cb) {
          var err = new Error("ENOSYS: function not implemented, futime");
          err.errno = -109;
          err.code = "ENOSYS";
          err.syscall = "futime";
          //Mock timing difference
          process.nextTick(cb, err);
        },
      );

      var fd = fs.openSync(outputPath, "w+");
      assert.strictEqual(typeof fd === "number", true);

      var stat = fs.fstatSync(fd);

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {
          mtime: new Date(stat.mtime - 1000),
          atime: new Date(stat.atime - 1000),
        },
      });

      updateMetadata(fd, file, function (err) {
        assert.ifError(err);
        assert.strictEqual(futimesSpy.mock.callCount(), 1);
        // Times were updated to match the filesystem since futimes wasn't implemented
        assert.deepStrictEqual(file.stat.mtime, stat.mtime);
        assert.deepStrictEqual(file.stat.atime, stat.atime);

        fs.close(fd, done);
      });
    },
  );

  it(
    "updates the mode on fs and vinyl object if there is a diff",
    { skip: isWindows },
    function (t, done) {
      var fchmodSpy = t.mock.method(fs, "fchmod");

      var mode = applyUmask("777");

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {
          mode: mode,
        },
      });

      var fd = fs.openSync(outputPath, "w+");

      updateMetadata(fd, file, function (err) {
        assert.ifError(err);
        assert.strictEqual(fchmodSpy.mock.callCount(), 1);
        var stats = fs.fstatSync(fd);
        assert.strictEqual(file.stat.mode, stats.mode);

        fs.close(fd, done);
      });
    },
  );

  it(
    "updates the sticky bit on mode on fs and vinyl object if there is a diff",
    { skip: isWindows },
    function (t, done) {
      var fchmodSpy = t.mock.method(fs, "fchmod");

      var mode = applyUmask("1777");

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {
          mode: mode,
        },
      });

      var fd = fs.openSync(outputPath, "w+");

      updateMetadata(fd, file, function () {
        assert.strictEqual(fchmodSpy.mock.callCount(), 1);
        var stats = fs.fstatSync(fd);
        assert.strictEqual(file.stat.mode, stats.mode);

        fs.close(fd, done);
      });
    },
  );

  it(
    "forwards fchmod error and descriptor upon error",
    { skip: isWindows },
    function (t, done) {
      var mode = applyUmask("777");

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {
          mode: mode,
        },
      });

      var fd = fs.openSync(outputPath, "w+");
      var fchmodSpy = t.mock.method(fs, "fchmod", (fd, mode, cb) => {
        process.nextTick(mockError, fd, mode, cb);
      });

      updateMetadata(fd, file, function (err) {
        assert.ok(err != null);
        assert.strictEqual(fchmodSpy.mock.callCount(), 1);

        fs.close(fd, done);
      });
    },
  );

  it(
    "updates the mode & times on fs and vinyl object if there is a diff",
    { skip: isWindows },
    function (t, done) {
      var fchmodSpy = t.mock.method(fs, "fchmod");
      var futimesSpy = t.mock.method(fs, "futimes");

      // Use new atime/mtime
      var atime = new Date(Date.now() - 2048);
      var mtime = new Date(Date.now() - 1024);
      var mtimeEarlier = mtime.getTime() - 1000;
      var atimeEarlier = atime.getTime() - 1000;

      var mode = applyUmask("777");

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {
          mtime: new Date(mtimeEarlier),
          atime: new Date(atimeEarlier),
          mode: mode,
        },
      });

      var fd = fs.openSync(outputPath, "w+");

      updateMetadata(fd, file, function () {
        assert.strictEqual(fchmodSpy.mock.callCount(), 1);
        assert.strictEqual(futimesSpy.mock.callCount(), 1);

        var atimeSpy = futimesSpy.mock.calls[0].arguments[1];
        var mtimeSpy = futimesSpy.mock.calls[0].arguments[2];

        assert.deepStrictEqual(file.stat.mtime, new Date(mtimeEarlier));
        assert.deepStrictEqual(mtimeSpy.getTime(), mtimeEarlier);
        assert.deepStrictEqual(file.stat.atime, new Date(atimeEarlier));
        assert.deepStrictEqual(atimeSpy.getTime(), atimeEarlier);

        fs.close(fd, done);
      });
    },
  );

  it(
    "forwards fchmod error and descriptor through futimes if there is a time diff",
    { skip: isWindows },
    function (t, done) {
      var mockedErr = new Error("mocked error");

      var fchmodSpy = t.mock.method(fs, "fchmod", function (fd, mode, cb) {
        cb(mockedErr);
      });
      var futimesSpy = t.mock.method(fs, "futimes");

      var now = Date.now();
      var then = now - 1000;
      var mode = applyUmask("777");

      var file = new File({
        base: outputBase,
        path: outputPath,
        contents: null,
        stat: {
          mtime: new Date(then),
          atime: new Date(then),
          mode: mode,
        },
      });

      var fd = fs.openSync(outputPath, "w");

      updateMetadata(fd, file, function (err) {
        assert.ok(err != null);
        assert.strictEqual(err, mockedErr);
        assert.strictEqual(fchmodSpy.mock.callCount(), 1);
        assert.strictEqual(futimesSpy.mock.callCount(), 1);

        fs.close(fd, done);
      });
    },
  );

  // TODO: forward fchown error tests
});

describeStreams("createWriteStream", function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var chunks = streamUtils.chunks;

  beforeEach(clean);
  afterEach(clean);

  beforeEach(function (t, done) {
    // For some reason, the outputDir sometimes exists on Windows
    // So we use our mkdirp to create it
    mkdirp(outputBase, done);
  });

  it("accepts just a file path and writes to it", function (t, done) {
    function assertion(err) {
      var outputContents = fs.readFileSync(outputPath, "utf8");
      assert.strictEqual(outputContents, contents);
      done(err);
    }

    pipeline([from([contents]), createWriteStream(outputPath)], assertion);
  });

  it("accepts just a file path and writes a large file to it", function (t, done) {
    var size = 40000;

    function assertion(err) {
      var stats = fs.lstatSync(outputPath);

      assert.strictEqual(stats.size, size);
      done(err);
    }

    pipeline([chunks(size), createWriteStream(outputPath)], assertion);
  });

  it("accepts flags option", function (t, done) {
    // Write 13 stars then 12345 because the length of expected is 13
    fs.writeFileSync(outputPath, "*************12345");

    function assertion(err) {
      var outputContents = fs.readFileSync(outputPath, "utf8");
      assert.strictEqual(outputContents, contents + "12345");
      done(err);
    }

    pipeline(
      [
        from([contents]),
        // Replaces from the beginning of the file
        createWriteStream(outputPath, { flags: "r+" }),
      ],
      assertion,
    );
  });

  it("accepts append flag as option & places cursor at the end", function (t, done) {
    fs.writeFileSync(outputPath, "12345");

    function assertion(err) {
      var outputContents = fs.readFileSync(outputPath, "utf8");
      assert.strictEqual(outputContents, "12345" + contents);
      done(err);
    }

    pipeline(
      [
        from([contents]),
        // Appends to the end of the file
        createWriteStream(outputPath, { flags: "a" }),
      ],
      assertion,
    );
  });

  it("accepts mode option", { skip: isWindows }, function (t, done) {
    var mode = applyUmask("777");

    function assertion(err) {
      assert.strictEqual(statMode(outputPath), mode);
      done(err);
    }

    pipeline(
      [from([contents]), createWriteStream(outputPath, { mode: mode })],
      assertion,
    );
  });

  it("uses default file mode if no mode options", function (t, done) {
    var defaultMode = applyUmask(DEFAULT_FILE_MODE);

    function assertion(err) {
      assert.strictEqual(statMode(outputPath), defaultMode);
      done(err);
    }

    pipeline([from([contents]), createWriteStream(outputPath)], assertion);
  });

  it("accepts a flush function that is called before close emitted", function (t, done) {
    var flushCalled = false;

    var outStream = createWriteStream(outputPath, {}, function (fd, cb) {
      flushCalled = true;
      cb();
    });

    function assertion(err) {
      assert.strictEqual(flushCalled, true);
      done(err);
    }

    pipeline([from([contents]), outStream], assertion);
  });

  it("can specify flush without options argument", function (t, done) {
    var flushCalled = false;

    var outStream = createWriteStream(outputPath, function (fd, cb) {
      flushCalled = true;
      cb();
    });

    function assertion(err) {
      assert.strictEqual(flushCalled, true);
      done(err);
    }

    pipeline([from([contents]), outStream], assertion);
  });

  it("passes the file descriptor to flush", function (t, done) {
    var flushCalled = false;

    var outStream = createWriteStream(outputPath, function (fd, cb) {
      assert.strictEqual(typeof fd, "number");
      flushCalled = true;
      cb();
    });

    function assertion(err) {
      assert.strictEqual(flushCalled, true);
      done(err);
    }

    pipeline([from([contents]), outStream], assertion);
  });

  it("passes a callback to flush to call when work is done", function (t, done) {
    var flushCalled = false;
    var timeoutCalled = false;

    var outStream = createWriteStream(outputPath, function (fd, cb) {
      flushCalled = true;
      setTimeout(function () {
        timeoutCalled = true;
        cb();
      }, 250);
    });

    function assertion(err) {
      assert.strictEqual(flushCalled, true);
      assert.strictEqual(timeoutCalled, true);
      done(err);
    }

    pipeline([from([contents]), outStream], assertion);
  });

  it("emits an error if open fails", function (t, done) {
    var badOutputPath = path.join(outputBase, "./non-exist/test.coffee");

    function assertion(err) {
      assert.ok(err instanceof Error);
      done();
    }

    pipeline([from([contents]), createWriteStream(badOutputPath)], assertion);
  });

  it("emits an error if write fails", function (t, done) {
    // Create the file so it can be opened with `r`
    fs.writeFileSync(outputPath, contents);

    function assertion(err) {
      assert.ok(err instanceof Error);
      done();
    }

    pipeline(
      [from([contents]), createWriteStream(outputPath, { flags: "r" })],
      assertion,
    );
  });
});
