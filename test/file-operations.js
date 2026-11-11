"use strict";

var path = require("node:path");
var buffer = require("node:buffer");
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

var skipWin = { skip: isWindows };

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

describe("isOwner", () => {
  var ownerStat = {
    uid: 9001,
  };

  var nonOwnerStat = {
    uid: 9002,
  };

  beforeEach(() => {
    if (typeof process.geteuid !== "function") {
      process.geteuid = noop;
    }

    if (typeof process.getuid !== "function") {
      process.getuid = noop;
    }
  });

  afterEach((t) => {
    // Restore mocked methods before removing Windows placeholders.
    t.mock.restoreAll();

    if (process.geteuid === noop) {
      delete process.geteuid;
    }

    if (process.getuid === noop) {
      delete process.getuid;
    }
  });

  // TODO: test for having neither
  // TODO something is funky with how these methods interact if we do not mock gateuid later tests will fail most likely something gets overwritten in the chain.
  it("uses process.geteuid() when available", function (t) {
    var getuidSpy = t.mock.method(process, "getuid", () => ownerStat.uid);
    var geteuidSpy = t.mock.method(process, "geteuid", () => ownerStat.uid);

    isOwner(ownerStat);

    t.assert.strictEqual(getuidSpy.mock.callCount(), 0);
    t.assert.strictEqual(geteuidSpy.mock.callCount(), 1);
  });

  it("uses process.getuid() when geteuid() is not available", function (t) {
    var getuidSpy = t.mock.method(process, "getuid", () => ownerStat.uid);
    // TODO why will this cause fs methods to fail in updateMetadata if not mocked
    t.mock.method(process, "geteuid", () => ownerStat.uid);

    delete process.geteuid;

    isOwner(ownerStat);

    t.assert.strictEqual(getuidSpy.mock.callCount(), 1);
  });

  it("returns false when non-root and non-owner", (t) => {
    var result = isOwner(nonOwnerStat);

    t.assert.strictEqual(result, false);
  });

  it("returns true when owner and non-root", function (t) {
    t.mock.method(process, "geteuid", () => ownerStat.uid);
    var result = isOwner(ownerStat);
    t.assert.strictEqual(result, true);
  });

  it("returns true when non-owner but root", function (t) {
    var spy = t.mock.method(process, "geteuid", () => 0);

    var result = isOwner(nonOwnerStat);

    t.assert.strictEqual(result, true);
    t.assert.strictEqual(spy.mock.callCount(), 1);
  });
});

describe("isValidUnixId", () => {
  it("returns true if the given id is a valid unix id", (t) => {
    var result = isValidUnixId(1000);

    t.assert.strictEqual(result, true);
  });

  it("returns false if the given id is not a number", (t) => {
    var result = isValidUnixId("root");

    t.assert.strictEqual(result, false);
  });

  it("returns false when the given id is less than 0", (t) => {
    var result = isValidUnixId(-1);

    t.assert.strictEqual(result, false);
  });
});

describe("getFlags", () => {
  it("returns wx if overwrite is false and append is false", (t) => {
    var result = getFlags({
      overwrite: false,
      append: false,
    });

    t.assert.strictEqual(result, "wx");
  });

  it("returns w if overwrite is true and append is false", (t) => {
    var result = getFlags({
      overwrite: true,
      append: false,
    });

    t.assert.strictEqual(result, "w");
  });

  it("returns ax if overwrite is false and append is true", (t) => {
    var result = getFlags({
      overwrite: false,
      append: true,
    });

    t.assert.strictEqual(result, "ax");
  });

  it("returns a if overwrite is true and append is true", (t) => {
    var result = getFlags({
      overwrite: true,
      append: true,
    });

    t.assert.strictEqual(result, "a");
  });
});

describe("isFatalOverwriteError", () => {
  it("returns false if not given any error", (t) => {
    var result = isFatalOverwriteError(null);

    t.assert.strictEqual(result, false);
  });

  it("returns true if code != EEXIST", (t) => {
    var result = isFatalOverwriteError({ code: "EOTHER" });

    t.assert.strictEqual(result, true);
  });

  it("returns false if code == EEXIST and flags == wx", (t) => {
    var result = isFatalOverwriteError({ code: "EEXIST" }, "wx");

    t.assert.strictEqual(result, false);
  });

  it("returns false if code == EEXIST and flags == ax", (t) => {
    var result = isFatalOverwriteError({ code: "EEXIST" }, "ax");

    t.assert.strictEqual(result, false);
  });

  it("returns true if error.code == EEXIST and flags == w", (t) => {
    var result = isFatalOverwriteError({ code: "EEXIST" }, "w");

    t.assert.strictEqual(result, true);
  });

  it("returns true if error.code == EEXIST and flags == a", (t) => {
    var result = isFatalOverwriteError({ code: "EEXIST" }, "a");

    t.assert.strictEqual(result, true);
  });
});

describe("isFatalUnlinkError", () => {
  it("returns false if not given any error", (t) => {
    var result = isFatalUnlinkError(null);

    t.assert.strictEqual(result, false);
  });

  it("returns false if code == ENOENT", (t) => {
    var result = isFatalUnlinkError({ code: "ENOENT" }, "wx");

    t.assert.strictEqual(result, false);
  });

  it("returns true if code != ENOENT", (t) => {
    var result = isFatalUnlinkError({ code: "EOTHER" });

    t.assert.strictEqual(result, true);
  });
});

describe("getModeDiff", () => {
  it("returns 0 if both modes are the same", (t) => {
    var fsMode = applyUmask("777");
    var vfsMode = applyUmask("777");

    var result = getModeDiff(fsMode, vfsMode);

    t.assert.strictEqual(result, 0);
  });

  it("returns 0 if vinyl mode is not a number", (t) => {
    var fsMode = applyUmask("777");
    var vfsMode = undefined;

    var result = getModeDiff(fsMode, vfsMode);

    t.assert.strictEqual(result, 0);
  });

  it("returns a value greater than 0 if modes are different", (t) => {
    var fsMode = applyUmask("777");
    var vfsMode = applyUmask("744");

    var result = getModeDiff(fsMode, vfsMode);

    t.assert.strictEqual(result > 0, true);
  });

  it("returns the proper diff", (t) => {
    var fsMode = applyUmask("777");
    var vfsMode = applyUmask("744");
    var expectedDiff = applyUmask("33");

    var result = getModeDiff(fsMode, vfsMode);

    t.assert.strictEqual(result, expectedDiff);
  });

  it("does not matter the order of diffing", (t) => {
    var fsMode = applyUmask("655");
    var vfsMode = applyUmask("777");
    var expectedDiff = applyUmask("122");

    var result = getModeDiff(fsMode, vfsMode);

    t.assert.strictEqual(result, expectedDiff);
  });

  it("includes the sticky/setuid/setgid bits", (t) => {
    var fsMode = applyUmask("1777");
    var vfsMode = applyUmask("4777");
    var expectedDiff = applyUmask("5000");

    var result = getModeDiff(fsMode, vfsMode);

    t.assert.strictEqual(result, expectedDiff);
  });
});

describe("getTimesDiff", () => {
  it("returns undefined if vinyl mtime is not a valid date", (t) => {
    var fsStat = {
      mtime: new Date(),
    };
    var vfsStat = {
      mtime: new Date(undefined),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    t.assert.strictEqual(result, undefined);
  });

  it("returns undefined if vinyl mtime & atime are both equal to counterparts", (t) => {
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

    t.assert.strictEqual(result, undefined);
  });

  // TODO: is this proper/expected?
  it("returns undefined if vinyl mtimes equals the counterpart and atimes are null", (t) => {
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

    t.assert.strictEqual(result, undefined);
  });

  it("returns a diff object if mtimes do not match", (t) => {
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

    t.assert.deepStrictEqual(result, expected);
  });

  it("returns a diff object if atimes do not match", (t) => {
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

    t.assert.deepStrictEqual(result, expected);
  });

  it("returns the fs atime if the vinyl atime is invalid", (t) => {
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

    t.assert.deepStrictEqual(result, expected);
  });

  // TODO: is this proper/expected?
  it("makes atime diff undefined if fs and vinyl atime are invalid", (t) => {
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

    t.assert.deepStrictEqual(result, expected);
  });
});

describe("getOwnerDiff", () => {
  it("returns undefined if vinyl uid & gid are invalid", (t) => {
    var fsStat = {
      uid: 1000,
      gid: 1000,
    };
    var vfsStat = {
      uid: undefined,
      gid: undefined,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    t.assert.strictEqual(result, undefined);
  });

  it("returns undefined if vinyl uid & gid are both equal to counterparts", (t) => {
    var fsStat = {
      uid: 1000,
      gid: 1000,
    };
    var vfsStat = {
      uid: 1000,
      gid: 1000,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    t.assert.strictEqual(result, undefined);
  });

  it("returns a diff object if uid or gid do not match", (t) => {
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

    t.assert.deepStrictEqual(result, expected);

    vfsStat = {
      uid: 1000,
      gid: 1001,
    };
    expected = {
      uid: 1000,
      gid: 1001,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    t.assert.deepStrictEqual(result, expected);
  });

  it("returns the fs uid if the vinyl uid is invalid", (t) => {
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

    t.assert.deepStrictEqual(result, expected);

    vfsStat = {
      uid: -1,
      gid: 1001,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    t.assert.deepStrictEqual(result, expected);
  });

  it("returns the fs gid if the vinyl gid is invalid", (t) => {
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

    t.assert.deepStrictEqual(result, expected);

    vfsStat = {
      uid: 1001,
      gid: -1,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    t.assert.deepStrictEqual(result, expected);
  });

  it("returns undefined if fs and vinyl uid are invalid", (t) => {
    var fsStat = {
      uid: undefined,
      gid: 1000,
    };
    var vfsStat = {
      uid: undefined,
      gid: 1001,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    t.assert.strictEqual(result, undefined);

    fsStat = {
      uid: -1,
      gid: 1000,
    };
    vfsStat = {
      uid: -1,
      gid: 1001,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    t.assert.strictEqual(result, undefined);
  });

  it("returns undefined if fs and vinyl gid are invalid", (t) => {
    var fsStat = {
      uid: 1000,
      gid: undefined,
    };
    var vfsStat = {
      uid: 1001,
      gid: undefined,
    };

    var result = getOwnerDiff(fsStat, vfsStat);

    t.assert.strictEqual(result, undefined);

    fsStat = {
      uid: 1000,
      gid: -1,
    };
    vfsStat = {
      uid: 1001,
      gid: -1,
    };

    result = getOwnerDiff(fsStat, vfsStat);

    t.assert.strictEqual(result, undefined);
  });
});

describe("closeFd", () => {
  // This is just a very large number since node broke our tests by disallowing -1
  // We're also doing some hacky version matching because node 0.12 accepts 10000 on Windows (and fails the test)
  var invalidFd = process.version[1] === "0" ? -1 : 10000;

  it("calls the callback with propagated error if fd is not a number", (t, done) => {
    var propagatedError = new Error();

    closeFd(propagatedError, null, function (err) {
      t.assert.strictEqual(err, propagatedError);

      done();
    });
  });

  it("calls the callback with close error if no error to propagate", (t, done) => {
    closeFd(null, invalidFd, function (err) {
      t.assert.ok(err != null);

      done();
    });
  });

  it("calls the callback with propagated error if close errors", (t, done) => {
    var propagatedError = new Error();

    closeFd(propagatedError, invalidFd, function (err) {
      t.assert.strictEqual(err, propagatedError);

      done();
    });
  });

  it("calls the callback with propagated error if close succeeds", (t, done) => {
    var propagatedError = new Error();

    var fd = fs.openSync(inputPath, "r");

    var closeSpy = t.mock.method(fs, "close");

    closeFd(propagatedError, fd, function (err) {
      t.assert.strictEqual(closeSpy.mock.callCount(), 1);
      t.assert.strictEqual(err, propagatedError);

      done();
    });
  });

  it("calls the callback with no error if close succeeds & no propagated error", (t, done) => {
    var fd = fs.openSync(inputPath, "r");

    var spy = t.mock.method(fs, "close");

    closeFd(null, fd, function (err) {
      t.assert.strictEqual(spy.mock.callCount(), 1);
      t.assert.strictEqual(err, undefined);

      done();
    });
  });
});

describe("writeFile", () => {
  beforeEach(clean);
  afterEach(clean);

  beforeEach((t, done) => {
    mkdirp(outputBase, done);
  });

  it("writes a file to the filesystem, does not close and returns the fd", (t, done) => {
    writeFile(outputPath, Buffer.from(contents), function (err, fd) {
      t.assert.ifError(err);
      t.assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, () => {
        var written = fs.readFileSync(outputPath, "utf8");

        t.assert.strictEqual(written, contents);

        done();
      });
    });
  });

  it("defaults to writing files with 0666 mode", (t, done) => {
    var expected = applyUmask("666");

    writeFile(outputPath, Buffer.from(contents), function (err, fd) {
      t.assert.ifError(err);
      t.assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, () => {
        t.assert.strictEqual(statMode(outputPath), expected);

        done();
      });
    });
  });

  // Changing the mode of a file is not supported by node.js in Windows.
  it("accepts a different mode in options", skipWin, (t, done) => {
    var expected = applyUmask("777");
    var options = {
      mode: expected,
    };

    writeFile(outputPath, Buffer.from(contents), options, function (err, fd) {
      t.assert.ifError(err);
      t.assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, () => {
        t.assert.strictEqual(statMode(outputPath), expected);

        done();
      });
    });
  });

  it("defaults to opening files with write flag", (t, done) => {
    var length = contents.length;

    writeFile(outputPath, Buffer.from(contents), function (err, fd) {
      t.assert.ifError(err);
      t.assert.strictEqual(typeof fd === "number", true);

      fs.read(fd, Buffer.alloc(length), 0, length, 0, function (readErr) {
        t.assert.ok(readErr != null);

        fs.close(fd, done);
      });
    });
  });

  it("accepts a different flags in options", (t, done) => {
    var length = contents.length;
    var options = {
      flags: "w+",
    };

    writeFile(outputPath, Buffer.from(contents), options, function (err, fd) {
      t.assert.ifError(err);
      t.assert.strictEqual(typeof fd === "number", true);

      fs.read(
        fd,
        Buffer.alloc(length),
        0,
        length,
        0,
        function (readErr, _, written) {
          t.assert.ifError(readErr);

          t.assert.strictEqual(written.toString(), contents);

          fs.close(fd, done);
        },
      );
    });
  });

  it("appends to a file if append flag is given", (t, done) => {
    var initial = "test";
    var toWrite = "-a-thing";

    fs.writeFileSync(outputPath, initial, "utf8");

    var expected = initial + toWrite;

    var options = {
      flags: "a",
    };

    writeFile(outputPath, Buffer.from(toWrite), options, function (err, fd) {
      t.assert.ifError(err);
      t.assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, () => {
        var written = fs.readFileSync(outputPath, "utf8");

        t.assert.strictEqual(written, expected);

        done();
      });
    });
  });

  it("does not pass a file descriptor if open call errors", (t, done) => {
    var notExistDir = path.join(__dirname, "./not-exist-dir/writeFile.txt");

    writeFile(notExistDir, Buffer.from(contents), function (err, fd) {
      t.assert.ok(err != null);
      t.assert.strictEqual(typeof fd === "number", false);

      done();
    });
  });

  it("passes a file descriptor if write call errors", (t, done) => {
    var options = {
      flags: "r",
    };

    writeFile(inputPath, Buffer.from(contents), options, function (err, fd) {
      t.assert.ok(err != null);
      t.assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, done);
    });
  });

  it("passes an error if called with string as data", (t, done) => {
    writeFile(outputPath, contents, function (err) {
      t.assert.ok(err != null);

      done();
    });
  });

  it("no error on SlowBuffer", { skip: !buffer.SlowBuffer }, (t, done) => {
    var length = contents.length;
    var buf = Buffer.from(contents);
    var content = new buffer.SlowBuffer(length);
    buf.copy(content, 0, 0, length);

    writeFile(outputPath, content, function (err, fd) {
      t.assert.ifError(err);
      t.assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, () => {
        var written = fs.readFileSync(outputPath, "utf8");

        t.assert.strictEqual(written, contents);

        done();
      });
    });
  });

  it("does not error if options is falsy", (t, done) => {
    writeFile(outputPath, Buffer.from(contents), null, function (err, fd) {
      t.assert.ifError(err);
      t.assert.strictEqual(typeof fd === "number", true);

      fs.close(fd, done);
    });
  });
});

describe("reflectStat", () => {
  beforeEach(clean);
  afterEach(clean);

  beforeEach((t, done) => {
    mkdirp(outputBase, done);
  });

  it("passes the error if stat fails", (t, done) => {
    var file = new File();

    reflectStat(neInputDirpath, file, function (err) {
      t.assert.ok(err != null);

      done();
    });
  });

  it("updates the vinyl with filesystem stats", (t, done) => {
    var file = new File();

    fs.symlinkSync(inputPath, symlinkPath);

    reflectStat(symlinkPath, file, () => {
      // There appears to be a bug in the Windows implementation which causes
      // the sync versions of stat and lstat to return unsigned 32-bit ints
      // whilst the async versions returns signed 32-bit ints... This affects
      // dev but possibly others as well?
      fs.stat(symlinkPath, function (err, stat) {
        t.assert.deepStrictEqual(file.stat, stat);

        done();
      });
    });
  });
});

describe("reflectLinkStat", () => {
  beforeEach(clean);
  afterEach(clean);

  beforeEach((t, done) => {
    mkdirp(outputBase, done);
  });

  it("passes the error if lstat fails", (t, done) => {
    var file = new File();

    reflectLinkStat(neInputDirpath, file, function (err) {
      t.assert.ok(err != null);

      done();
    });
  });

  it("updates the vinyl with filesystem symbolic stats", (t, done) => {
    var file = new File();

    fs.symlinkSync(inputPath, symlinkPath);

    reflectLinkStat(symlinkPath, file, () => {
      // There appears to be a bug in the Windows implementation which causes
      // the sync versions of stat and lstat to return unsigned 32-bit ints
      // whilst the async versions returns signed 32-bit ints... This affects
      // dev but possibly others as well?
      fs.lstat(symlinkPath, function (err, stat) {
        t.assert.deepStrictEqual(file.stat, stat);

        done();
      });
    });
  });
});

describe("updateMetadata", () => {
  beforeEach(clean);
  afterEach(clean);

  beforeEach((t, done) => {
    mkdirp(outputBase, done);
  });

  afterEach((t, done) => {
    if (process.geteuid === noop) {
      delete process.geteuid;
    }

    done();
  });

  // Changing the time of a directory errors in Windows.
  // Changing the mode of a file is not supported by node.js in Windows.
  // Windows is treated as though it does not have permission to make these operations.
  it("passes the error if fstat fails", skipWin, (t, done) => {
    var fd = 9001;

    var file = new File({
      base: outputBase,
      path: outputPath,
      contents: null,
      stat: {},
    });

    updateMetadata(fd, file, function (err) {
      t.assert.ok(err != null);

      done();
    });
  });

  it("updates the vinyl object with fs stats", skipWin, (t, done) => {
    var file = new File({
      base: outputBase,
      path: outputPath,
      contents: null,
      stat: {},
    });

    var fd = fs.openSync(outputPath, "w+");
    var stats = fs.fstatSync(fd);

    updateMetadata(fd, file, () => {
      // Not sure why .toEqual doesn't match these
      Object.keys(file.stat).forEach(function (key) {
        t.assert.deepStrictEqual(file.stat[key], stats[key]);
      });

      fs.close(fd, done);
    });
  });

  it("does not touch the fs if nothing to update", skipWin, (t, done) => {
    var file = new File({
      base: outputBase,
      path: outputPath,
      contents: null,
      stat: {},
    });

    var fchmodSpy = t.mock.method(fs, "fchmod");
    var futimesSpy = t.mock.method(fs, "futimes");

    var fd = fs.openSync(outputPath, "w+");

    updateMetadata(fd, file, () => {
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 0);
      t.assert.strictEqual(futimesSpy.mock.callCount(), 0);

      fs.close(fd, done);
    });
  });

  it("does not touch the fs if not owner of the file", skipWin, (t, done) => {
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

    updateMetadata(fd, file, () => {
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 0);
      t.assert.strictEqual(futimesSpy.mock.callCount(), 0);

      fs.close(fd, done);
    });
  });

  it("updates times if there is a diff", skipWin, (t, done) => {
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

    updateMetadata(fd, file, () => {
      t.assert.strictEqual(futimesSpy.mock.callCount(), 1);
      // Var stats = fs.fstatSync(fd);
      var atimeSpy = futimesSpy.mock.calls[0].arguments[1];
      var mtimeSpy = futimesSpy.mock.calls[0].arguments[2];

      t.assert.deepStrictEqual(file.stat.mtime, new Date(mtimeEarlier));
      t.assert.deepStrictEqual(mtimeSpy.getTime(), mtimeEarlier);
      t.assert.deepStrictEqual(file.stat.atime, new Date(atimeEarlier));
      t.assert.deepStrictEqual(atimeSpy.getTime(), atimeEarlier);

      fs.close(fd, done);
    });
  });

  it("forwards futimes error and descriptor upon error", skipWin, (t, done) => {
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
    t.assert.strictEqual(typeof fd === "number", true);

    updateMetadata(fd, file, function (err) {
      t.assert.ok(err != null);
      t.assert.strictEqual(futimesSpy.mock.callCount(), 1);

      fs.close(fd, done);
    });
  });

  it("sets stats if missing futimes (issue 302)", skipWin, (t, done) => {
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
    t.assert.strictEqual(typeof fd === "number", true);

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
      t.assert.ifError(err);
      t.assert.strictEqual(futimesSpy.mock.callCount(), 1);
      // Times were updated to match the filesystem since futimes wasn't implemented
      t.assert.deepStrictEqual(file.stat.mtime, stat.mtime);
      t.assert.deepStrictEqual(file.stat.atime, stat.atime);

      fs.close(fd, done);
    });
  });

  it("updates the mode if there is a diff", skipWin, (t, done) => {
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
      t.assert.ifError(err);
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 1);
      var stats = fs.fstatSync(fd);
      t.assert.strictEqual(file.stat.mode, stats.mode);

      fs.close(fd, done);
    });
  });

  it("updates the sticky bit if there is a diff", skipWin, (t, done) => {
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

    updateMetadata(fd, file, () => {
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 1);
      var stats = fs.fstatSync(fd);
      t.assert.strictEqual(file.stat.mode, stats.mode);

      fs.close(fd, done);
    });
  });

  it("forwards fchmod error and descriptor upon error", skipWin, (t, done) => {
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
      t.assert.ok(err != null);
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 1);

      fs.close(fd, done);
    });
  });

  it("updates the mode & times if there is a diff", skipWin, (t, done) => {
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

    updateMetadata(fd, file, () => {
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 1);
      t.assert.strictEqual(futimesSpy.mock.callCount(), 1);

      var atimeSpy = futimesSpy.mock.calls[0].arguments[1];
      var mtimeSpy = futimesSpy.mock.calls[0].arguments[2];

      t.assert.deepStrictEqual(file.stat.mtime, new Date(mtimeEarlier));
      t.assert.deepStrictEqual(mtimeSpy.getTime(), mtimeEarlier);
      t.assert.deepStrictEqual(file.stat.atime, new Date(atimeEarlier));
      t.assert.deepStrictEqual(atimeSpy.getTime(), atimeEarlier);

      fs.close(fd, done);
    });
  });

  it("forwards fchmod error if there's a time diff", skipWin, (t, done) => {
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
      t.assert.ok(err != null);
      t.assert.strictEqual(err, mockedErr);
      t.assert.strictEqual(fchmodSpy.mock.callCount(), 1);
      t.assert.strictEqual(futimesSpy.mock.callCount(), 1);

      fs.close(fd, done);
    });
  });

  // TODO: forward fchown error tests
});

describeStreams("createWriteStream", function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var chunks = streamUtils.chunks;

  beforeEach(clean);
  afterEach(clean);

  beforeEach((t, done) => {
    // For some reason, the outputDir sometimes exists on Windows
    // So we use our mkdirp to create it
    mkdirp(outputBase, done);
  });

  it("accepts just a file path and writes to it", (t, done) => {
    function assert(err) {
      var outputContents = fs.readFileSync(outputPath, "utf8");
      t.assert.strictEqual(outputContents, contents);
      done(err);
    }

    pipeline([from([contents]), createWriteStream(outputPath)], assert);
  });

  it("accepts just a file path and writes a large file to it", (t, done) => {
    var size = 40000;

    function assert(err) {
      var stats = fs.lstatSync(outputPath);

      t.assert.strictEqual(stats.size, size);
      done(err);
    }

    pipeline([chunks(size), createWriteStream(outputPath)], assert);
  });

  it("accepts flags option", (t, done) => {
    // Write 13 stars then 12345 because the length of expected is 13
    fs.writeFileSync(outputPath, "*************12345");

    function assert(err) {
      var outputContents = fs.readFileSync(outputPath, "utf8");
      t.assert.strictEqual(outputContents, contents + "12345");
      done(err);
    }

    pipeline(
      [
        from([contents]),
        // Replaces from the beginning of the file
        createWriteStream(outputPath, { flags: "r+" }),
      ],
      assert,
    );
  });

  it("accepts append flag as option & places cursor at the end", (t, done) => {
    fs.writeFileSync(outputPath, "12345");

    function assert(err) {
      var outputContents = fs.readFileSync(outputPath, "utf8");
      t.assert.strictEqual(outputContents, "12345" + contents);
      done(err);
    }

    pipeline(
      [
        from([contents]),
        // Appends to the end of the file
        createWriteStream(outputPath, { flags: "a" }),
      ],
      assert,
    );
  });

  // Changing the mode of a file is not supported by node.js in Windows.
  it("accepts mode option", skipWin, (t, done) => {
    var mode = applyUmask("777");

    function assert(err) {
      t.assert.strictEqual(statMode(outputPath), mode);
      done(err);
    }

    pipeline(
      [from([contents]), createWriteStream(outputPath, { mode: mode })],
      assert,
    );
  });

  it("uses default file mode if no mode options", (t, done) => {
    var defaultMode = applyUmask(DEFAULT_FILE_MODE);

    function assert(err) {
      t.assert.strictEqual(statMode(outputPath), defaultMode);
      done(err);
    }

    pipeline([from([contents]), createWriteStream(outputPath)], assert);
  });

  it("accepts a flush function that is called before close emitted", (t, done) => {
    var flushCalled = false;

    var outStream = createWriteStream(outputPath, {}, function (fd, cb) {
      flushCalled = true;
      cb();
    });

    function assert(err) {
      t.assert.strictEqual(flushCalled, true);
      done(err);
    }

    pipeline([from([contents]), outStream], assert);
  });

  it("can specify flush without options argument", (t, done) => {
    var flushCalled = false;

    var outStream = createWriteStream(outputPath, function (fd, cb) {
      flushCalled = true;
      cb();
    });

    function assert(err) {
      t.assert.strictEqual(flushCalled, true);
      done(err);
    }

    pipeline([from([contents]), outStream], assert);
  });

  it("passes the file descriptor to flush", (t, done) => {
    var flushCalled = false;

    var outStream = createWriteStream(outputPath, function (fd, cb) {
      t.assert.strictEqual(typeof fd, "number");
      flushCalled = true;
      cb();
    });

    function assert(err) {
      t.assert.strictEqual(flushCalled, true);
      done(err);
    }

    pipeline([from([contents]), outStream], assert);
  });

  it("passes a callback to flush to call when work is done", (t, done) => {
    var flushCalled = false;
    var timeoutCalled = false;

    var outStream = createWriteStream(outputPath, function (fd, cb) {
      flushCalled = true;
      setTimeout(() => {
        timeoutCalled = true;
        cb();
      }, 250);
    });

    function assert(err) {
      t.assert.strictEqual(flushCalled, true);
      t.assert.strictEqual(timeoutCalled, true);
      done(err);
    }

    pipeline([from([contents]), outStream], assert);
  });

  it("emits an error if open fails", (t, done) => {
    var badOutputPath = path.join(outputBase, "./non-exist/test.coffee");

    function assert(err) {
      t.assert.ok(err instanceof Error);
      done();
    }

    pipeline([from([contents]), createWriteStream(badOutputPath)], assert);
  });

  it("emits an error if write fails", (t, done) => {
    // Create the file so it can be opened with `r`
    fs.writeFileSync(outputPath, contents);

    function assert(err) {
      t.assert.ok(err instanceof Error);
      done();
    }

    pipeline(
      [from([contents]), createWriteStream(outputPath, { flags: "r" })],
      assert,
    );
  });
});
