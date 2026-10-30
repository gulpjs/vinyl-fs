"use strict";

var assert = require("node:assert");
var { afterEach, beforeEach, it } = require("node:test");

var fs = require("graceful-fs");
var File = require("vinyl");

var vfs = require("../");

var cleanup = require("./utils/cleanup");
var isWindows = require("./utils/is-windows");
var testConstants = require("./utils/test-constants");
var describeStreams = require("./utils/suite");

var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

describeStreams(".dest() with custom owner", function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  beforeEach(clean);
  afterEach(clean);

  it(
    "calls fchown when the uid and/or gid are provided on the vinyl stat",
    { skip: isWindows },
    function (t, done) {
      var fchownSpy = t.mock.method(fs, "fchown");

      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
        stat: {
          uid: 1002,
          gid: 1002,
        },
      });

      function assertion() {
        assert.strictEqual(fchownSpy.mock.callCount(), 1);
        assert.strictEqual(fchownSpy.mock.calls[0].arguments[1], 1002);
        assert.strictEqual(fchownSpy.mock.calls[0].arguments[2], 1002);
        done();
      }

      pipeline([from([file]), vfs.dest(outputBase)], assertion);
    },
  );

  it(
    "does not call fchown when the uid and gid provided on the vinyl stat are invalid",
    { skip: isWindows },
    function (t, done) {
      var fchownSpy = t.mock.method(fs, "fchown");

      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
        stat: {
          uid: -1,
          gid: -1,
        },
      });

      function assertion() {
        assert.strictEqual(fchownSpy.mock.callCount(), 0);
        done();
      }

      pipeline([from([file]), vfs.dest(outputBase)], assertion);
    },
  );
});
