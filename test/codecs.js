"use strict";

var assert = require("node:assert");
var { describe, it } = require("node:test");

var fs = require("graceful-fs");

var getCodec = require("../lib/codecs");
var DEFAULT_ENCODING = require("../lib/constants").DEFAULT_ENCODING;

var testCodec = require("./utils/codecs");
var testStreams = require("./utils/test-streams");
var testConstants = require("./utils/test-constants");
var describeStreams = require("./utils/suite");

var beNotBomInputPath = testConstants.beNotBomInputPath;
var leNotBomInputPath = testConstants.leNotBomInputPath;
var notBomContents = testConstants.notBomContents;
var encodedInputPath = testConstants.encodedInputPath;
var encodedContents = testConstants.encodedContents;

describe("codecs", function () {
  it("exports a function", function () {
    assert.strictEqual(typeof getCodec, "function");
  });

  it("returns undefined for unsupported encoding", function () {
    var codec = getCodec("fubar42");
    assert.strictEqual(codec, undefined);
  });

  it(
    "returns a proper codec for default encoding " + DEFAULT_ENCODING,
    function () {
      var codec = getCodec(DEFAULT_ENCODING);
      testCodec(codec);
      assert.strictEqual(codec.enc, DEFAULT_ENCODING);
      assert.strictEqual(codec.bomAware, true);
    },
  );

  it("returns a proper codec for utf16be", function () {
    var codec = getCodec("utf16be");
    testCodec(codec);
    assert.strictEqual(codec.bomAware, true);
  });

  it("returns a proper codec for utf16le", function () {
    var codec = getCodec("utf16le");
    testCodec(codec);
    assert.strictEqual(codec.bomAware, true);
  });

  it("returns a proper codec for gb2312", function () {
    var codec = getCodec("gb2312");
    testCodec(codec);
  });

  describe("buffer", function () {
    it("can decode bytes from utf16be encoding to a string", function () {
      var codec = getCodec("utf16be");
      var expected = notBomContents.replace("X", "BE");

      var result = codec.decode(fs.readFileSync(beNotBomInputPath));
      assert.ok(result != null);
      assert.strictEqual(typeof result, "string");
      assert.strictEqual(result.slice(2), expected); // Ignore leading garbage
    });

    it("can encode a string to bytes in utf16be encoding", function () {
      var codec = getCodec("utf16be");
      var expected = fs.readFileSync(beNotBomInputPath);

      var result = codec.encode(notBomContents.replace("X", "BE"));
      assert.ok(result != null);
      assert.strictEqual(typeof result, "object");
      assert.strictEqual(Buffer.isBuffer(result), true);
      assert.deepStrictEqual(result, expected.subarray(4)); // Ignore leading garbage
    });

    it("can decode bytes from utf16le encoding to a string", function () {
      var codec = getCodec("utf16le");
      var expected = notBomContents.replace("X", "LE");

      var result = codec.decode(fs.readFileSync(leNotBomInputPath));
      assert.ok(result != null);
      assert.strictEqual(typeof result, "string");
      assert.strictEqual(result.slice(2), expected); // Ignore leading garbage
    });

    it("can encode a string to bytes in utf16le encoding", function () {
      var codec = getCodec("utf16le");
      var expected = fs.readFileSync(leNotBomInputPath);

      var result = codec.encode(notBomContents.replace("X", "LE"));
      assert.ok(result != null);
      assert.strictEqual(typeof result, "object");
      assert.strictEqual(Buffer.isBuffer(result), true);
      assert.deepStrictEqual(result, expected.subarray(4)); // Ignore leading garbage
    });

    it("can decode bytes from gb2312 encoding to a string", function () {
      var codec = getCodec("gb2312");
      var expected = encodedContents;

      var result = codec.decode(fs.readFileSync(encodedInputPath));
      assert.strictEqual(result, expected);
    });

    it("can encode a string to bytes in gb2312 encoding", function () {
      var codec = getCodec("gb2312");
      var expected = fs.readFileSync(encodedInputPath);

      var result = codec.encode(encodedContents);
      assert.deepStrictEqual(result, expected);
    });
  });

  describeStreams("stream", function (stream) {
    var from = stream.Readable.from;
    var pipeline = stream.pipeline;

    var streamUtils = testStreams(stream);
    var concatString = streamUtils.concatString;
    var concatBuffer = streamUtils.concatBuffer;

    it("can decode bytes from utf16be encoding to a string", function (t, done) {
      var codec = getCodec("utf16be");
      var expected = notBomContents.replace("X", "BE");

      function assertion(result) {
        assert.ok(result != null);
        assert.strictEqual(typeof result, "string");
        assert.strictEqual(result.slice(2), expected); // Ignore leading garbage
      }

      pipeline(
        [
          fs.createReadStream(beNotBomInputPath),
          codec.decodeStream(),
          concatString(assertion),
        ],
        done,
      );
    });

    it("can encode a string to bytes in utf16be encoding", function (t, done) {
      var codec = getCodec("utf16be");
      var expected = fs.readFileSync(beNotBomInputPath);

      function assertion(result) {
        assert.ok(result != null);
        assert.strictEqual(Buffer.isBuffer(result), true);
        assert.deepStrictEqual(result, expected.subarray(4)); // Ignore leading garbage
      }

      pipeline(
        [
          from([notBomContents.replace("X", "BE")]),
          codec.encodeStream(),
          concatBuffer(assertion),
        ],
        done,
      );
    });

    it("can decode bytes from utf16le encoding to a string", function (t, done) {
      var codec = getCodec("utf16le");
      var expected = notBomContents.replace("X", "LE");

      function assertion(result) {
        assert.ok(result != null);
        assert.strictEqual(typeof result, "string");
        assert.strictEqual(result.slice(2), expected); // Ignore leading garbage
      }

      pipeline(
        [
          fs.createReadStream(leNotBomInputPath),
          codec.decodeStream(),
          concatString(assertion),
        ],
        done,
      );
    });

    it("can encode a string to bytes in utf16le encoding", function (t, done) {
      var codec = getCodec("utf16le");
      var expected = fs.readFileSync(leNotBomInputPath);

      function assertion(result) {
        assert.ok(result != null);
        assert.strictEqual(Buffer.isBuffer(result), true);
        assert.deepStrictEqual(result, expected.subarray(4)); // Ignore leading garbage
      }

      pipeline(
        [
          from([notBomContents.replace("X", "LE")]),
          codec.encodeStream(),
          concatBuffer(assertion),
        ],
        done,
      );
    });

    it("can decode bytes from gb2312 encoding to a string", function (t, done) {
      var codec = getCodec("gb2312");
      var expected = encodedContents;

      function assertion(result) {
        assert.strictEqual(result, expected);
      }

      pipeline(
        [
          fs.createReadStream(encodedInputPath),
          codec.decodeStream(),
          concatString(assertion),
        ],
        done,
      );
    });

    it("can encode a string to bytes in gb2312 encoding", function (t, done) {
      var codec = getCodec("gb2312");
      var expected = fs.readFileSync(encodedInputPath);

      function assertion(result) {
        assert.deepStrictEqual(result, expected);
      }

      pipeline(
        [
          from([encodedContents]),
          codec.encodeStream(),
          concatBuffer(assertion),
        ],
        done,
      );
    });
  });
});
