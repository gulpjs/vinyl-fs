"use strict";

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

describe("codecs", () => {
  it("exports a function", (t) => {
    t.assert.strictEqual(typeof getCodec, "function");
  });

  it("returns undefined for unsupported encoding", (t) => {
    var codec = getCodec("fubar42");
    t.assert.strictEqual(codec, undefined);
  });

  it("returns a proper codec for default encoding " + DEFAULT_ENCODING, (t) => {
    var codec = getCodec(DEFAULT_ENCODING);
    testCodec(codec);
    t.assert.strictEqual(codec.enc, DEFAULT_ENCODING);
    t.assert.strictEqual(codec.bomAware, true);
  });

  it("returns a proper codec for utf16be", (t) => {
    var codec = getCodec("utf16be");
    testCodec(codec);
    t.assert.strictEqual(codec.bomAware, true);
  });

  it("returns a proper codec for utf16le", (t) => {
    var codec = getCodec("utf16le");
    testCodec(codec);
    t.assert.strictEqual(codec.bomAware, true);
  });

  it("returns a proper codec for gb2312", () => {
    var codec = getCodec("gb2312");
    testCodec(codec);
  });

  describe("buffer", () => {
    it("can decode bytes from utf16be encoding to a string", (t) => {
      var codec = getCodec("utf16be");
      var expected = notBomContents.replace("X", "BE");

      var result = codec.decode(fs.readFileSync(beNotBomInputPath));
      t.assert.ok(result != null);
      t.assert.strictEqual(typeof result, "string");
      t.assert.strictEqual(result.slice(2), expected); // Ignore leading garbage
    });

    it("can encode a string to bytes in utf16be encoding", (t) => {
      var codec = getCodec("utf16be");
      var expected = fs.readFileSync(beNotBomInputPath);

      var result = codec.encode(notBomContents.replace("X", "BE"));
      t.assert.ok(result != null);
      t.assert.strictEqual(typeof result, "object");
      t.assert.strictEqual(Buffer.isBuffer(result), true);
      t.assert.deepStrictEqual(result, expected.subarray(4)); // Ignore leading garbage
    });

    it("can decode bytes from utf16le encoding to a string", (t) => {
      var codec = getCodec("utf16le");
      var expected = notBomContents.replace("X", "LE");

      var result = codec.decode(fs.readFileSync(leNotBomInputPath));
      t.assert.ok(result != null);
      t.assert.strictEqual(typeof result, "string");
      t.assert.strictEqual(result.slice(2), expected); // Ignore leading garbage
    });

    it("can encode a string to bytes in utf16le encoding", (t) => {
      var codec = getCodec("utf16le");
      var expected = fs.readFileSync(leNotBomInputPath);

      var result = codec.encode(notBomContents.replace("X", "LE"));
      t.assert.ok(result != null);
      t.assert.strictEqual(typeof result, "object");
      t.assert.strictEqual(Buffer.isBuffer(result), true);
      t.assert.deepStrictEqual(result, expected.subarray(4)); // Ignore leading garbage
    });

    it("can decode bytes from gb2312 encoding to a string", (t) => {
      var codec = getCodec("gb2312");
      var expected = encodedContents;

      var result = codec.decode(fs.readFileSync(encodedInputPath));
      t.assert.strictEqual(result, expected);
    });

    it("can encode a string to bytes in gb2312 encoding", (t) => {
      var codec = getCodec("gb2312");
      var expected = fs.readFileSync(encodedInputPath);

      var result = codec.encode(encodedContents);
      t.assert.deepStrictEqual(result, expected);
    });
  });

  describeStreams("stream", (stream) => {
    var from = stream.Readable.from;
    var pipeline = stream.pipeline;

    var streamUtils = testStreams(stream);
    var concatString = streamUtils.concatString;
    var concatBuffer = streamUtils.concatBuffer;

    it("can decode bytes from utf16be encoding to a string", (t, done) => {
      var codec = getCodec("utf16be");
      var expected = notBomContents.replace("X", "BE");

      function assert(result) {
        t.assert.ok(result != null);
        t.assert.strictEqual(typeof result, "string");
        t.assert.strictEqual(result.slice(2), expected); // Ignore leading garbage
      }

      pipeline(
        [
          fs.createReadStream(beNotBomInputPath),
          codec.decodeStream(),
          concatString(assert),
        ],
        done,
      );
    });

    it("can encode a string to bytes in utf16be encoding", (t, done) => {
      var codec = getCodec("utf16be");
      var expected = fs.readFileSync(beNotBomInputPath);

      function assert(result) {
        t.assert.ok(result != null);
        t.assert.strictEqual(Buffer.isBuffer(result), true);
        t.assert.deepStrictEqual(result, expected.subarray(4)); // Ignore leading garbage
      }

      pipeline(
        [
          from([notBomContents.replace("X", "BE")]),
          codec.encodeStream(),
          concatBuffer(assert),
        ],
        done,
      );
    });

    it("can decode bytes from utf16le encoding to a string", (t, done) => {
      var codec = getCodec("utf16le");
      var expected = notBomContents.replace("X", "LE");

      function assert(result) {
        t.assert.ok(result != null);
        t.assert.strictEqual(typeof result, "string");
        t.assert.strictEqual(result.slice(2), expected); // Ignore leading garbage
      }

      pipeline(
        [
          fs.createReadStream(leNotBomInputPath),
          codec.decodeStream(),
          concatString(assert),
        ],
        done,
      );
    });

    it("can encode a string to bytes in utf16le encoding", (t, done) => {
      var codec = getCodec("utf16le");
      var expected = fs.readFileSync(leNotBomInputPath);

      function assert(result) {
        t.assert.ok(result != null);
        t.assert.strictEqual(Buffer.isBuffer(result), true);
        t.assert.deepStrictEqual(result, expected.subarray(4)); // Ignore leading garbage
      }

      pipeline(
        [
          from([notBomContents.replace("X", "LE")]),
          codec.encodeStream(),
          concatBuffer(assert),
        ],
        done,
      );
    });

    it("can decode bytes from gb2312 encoding to a string", (t, done) => {
      var codec = getCodec("gb2312");
      var expected = encodedContents;

      function assert(result) {
        t.assert.strictEqual(result, expected);
      }

      pipeline(
        [
          fs.createReadStream(encodedInputPath),
          codec.decodeStream(),
          concatString(assert),
        ],
        done,
      );
    });

    it("can encode a string to bytes in gb2312 encoding", (t, done) => {
      var codec = getCodec("gb2312");
      var expected = fs.readFileSync(encodedInputPath);

      function assert(result) {
        t.assert.deepStrictEqual(result, expected);
      }

      pipeline(
        [from([encodedContents]), codec.encodeStream(), concatBuffer(assert)],
        done,
      );
    });
  });
});
