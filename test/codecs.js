'use strict';

var fs = require('graceful-fs');
var expect = require('expect');

var getCodec = require('../lib/codecs');
var DEFAULT_ENCODING = require('../lib/constants').DEFAULT_ENCODING;

var testCodec = require('./utils/codecs');
var testStreams = require('./utils/test-streams');
var testConstants = require('./utils/test-constants');
var describeStreams = require('./utils/suite');

var beNotBomInputPath = testConstants.beNotBomInputPath;
var leNotBomInputPath = testConstants.leNotBomInputPath;
var notBomContents = testConstants.notBomContents;
var encodedInputPath = testConstants.encodedInputPath;
var encodedContents = testConstants.encodedContents;

describe('codecs', function () {
  it('exports a function', function (done) {
    expect(typeof getCodec).toEqual('function');
    done();
  });

  it('returns undefined for unsupported encoding', function (done) {
    var codec = getCodec('fubar42');
    expect(codec).toBe(undefined);
    done();
  });

  it(
    'returns a proper codec for default encoding ' + DEFAULT_ENCODING,
    function (done) {
      var codec = getCodec(DEFAULT_ENCODING);
      testCodec(codec);
      expect(codec.enc).toEqual(DEFAULT_ENCODING);
      expect(codec.bomAware).toEqual(true);
      done();
    }
  );

  it('returns a proper codec for utf16be', function (done) {
    var codec = getCodec('utf16be');
    testCodec(codec);
    expect(codec.bomAware).toEqual(true);
    done();
  });

  it('returns a proper codec for utf16le', function (done) {
    var codec = getCodec('utf16le');
    testCodec(codec);
    expect(codec.bomAware).toEqual(true);
    done();
  });

  it('returns a proper codec for gb2312', function (done) {
    var codec = getCodec('gb2312');
    testCodec(codec);
    done();
  });

  describe('buffer', function () {
    it('can decode bytes from utf16be encoding to a string', function (done) {
      var codec = getCodec('utf16be');
      var expected = notBomContents.replace('X', 'BE');

      var result = codec.decode(fs.readFileSync(beNotBomInputPath));
      expect(result).toEqual(expect.anything());
      expect(typeof result).toEqual('string');
      expect(result.slice(2)).toEqual(expected); // Ignore leading garbage
      done();
    });

    it('can encode a string to bytes in utf16be encoding', function (done) {
      var codec = getCodec('utf16be');
      var expected = fs.readFileSync(beNotBomInputPath);

      var result = codec.encode(notBomContents.replace('X', 'BE'));
      expect(result).toEqual(expect.anything());
      expect(typeof result).toEqual('object');
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(expected.slice(4)); // Ignore leading garbage
      done();
    });

    it('can decode bytes from utf16le encoding to a string', function (done) {
      var codec = getCodec('utf16le');
      var expected = notBomContents.replace('X', 'LE');

      var result = codec.decode(fs.readFileSync(leNotBomInputPath));
      expect(result).toEqual(expect.anything());
      expect(typeof result).toEqual('string');
      expect(result.slice(2)).toEqual(expected); // Ignore leading garbage
      done();
    });

    it('can encode a string to bytes in utf16le encoding', function (done) {
      var codec = getCodec('utf16le');
      var expected = fs.readFileSync(leNotBomInputPath);

      var result = codec.encode(notBomContents.replace('X', 'LE'));
      expect(result).toEqual(expect.anything());
      expect(typeof result).toEqual('object');
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(expected.slice(4)); // Ignore leading garbage
      done();
    });

    it('can decode bytes from gb2312 encoding to a string', function (done) {
      var codec = getCodec('gb2312');
      var expected = encodedContents;

      var result = codec.decode(fs.readFileSync(encodedInputPath));
      expect(result).toEqual(expected);
      done();
    });

    it('can encode a string to bytes in gb2312 encoding', function (done) {
      var codec = getCodec('gb2312');
      var expected = fs.readFileSync(encodedInputPath);

      var result = codec.encode(encodedContents);
      expect(result).toEqual(expected);
      done();
    });
  });

  describeStreams('stream', function (stream) {
    before(function () {
      if (process.versions.node.startsWith("10.")) {
        this.skip();
        return;
      }
    });

    var from = stream.Readable.from;
    var pipeline = stream.pipeline;

    var streamUtils = testStreams(stream);
    var concatString = streamUtils.concatString;
    var concatBuffer = streamUtils.concatBuffer;

    it('can decode bytes from utf16be encoding to a string', function (done) {
      var codec = getCodec('utf16be');
      var expected = notBomContents.replace('X', 'BE');

      function assert(result) {
        expect(result).toEqual(expect.anything());
        expect(typeof result).toEqual('string');
        expect(result.slice(2)).toEqual(expected); // Ignore leading garbage
      }

      pipeline(
        [
          fs.createReadStream(beNotBomInputPath),
          codec.decodeStream(),
          concatString(assert),
        ],
        done
      );
    });

    it('can encode a string to bytes in utf16be encoding', function (done) {
      var codec = getCodec('utf16be');
      var expected = fs.readFileSync(beNotBomInputPath);

      function assert(result) {
        expect(result).toEqual(expect.anything());
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result).toEqual(expected.slice(4)); // Ignore leading garbage
      }

      pipeline(
        [
          from([notBomContents.replace('X', 'BE')]),
          codec.encodeStream(),
          concatBuffer(assert),
        ],
        done
      );
    });

    it('can decode bytes from utf16le encoding to a string', function (done) {
      var codec = getCodec('utf16le');
      var expected = notBomContents.replace('X', 'LE');

      function assert(result) {
        expect(result).toEqual(expect.anything());
        expect(typeof result).toEqual('string');
        expect(result.slice(2)).toEqual(expected); // Ignore leading garbage
      }

      pipeline(
        [
          fs.createReadStream(leNotBomInputPath),
          codec.decodeStream(),
          concatString(assert),
        ],
        done
      );
    });

    it('can encode a string to bytes in utf16le encoding', function (done) {
      var codec = getCodec('utf16le');
      var expected = fs.readFileSync(leNotBomInputPath);

      function assert(result) {
        expect(result).toEqual(expect.anything());
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result).toEqual(expected.slice(4)); // Ignore leading garbage
      }

      pipeline(
        [
          from([notBomContents.replace('X', 'LE')]),
          codec.encodeStream(),
          concatBuffer(assert),
        ],
        done
      );
    });

    it('can decode bytes from gb2312 encoding to a string', function (done) {
      var codec = getCodec('gb2312');
      var expected = encodedContents;

      function assert(result) {
        expect(result).toEqual(expected);
      }

      pipeline(
        [
          fs.createReadStream(encodedInputPath),
          codec.decodeStream(),
          concatString(assert),
        ],
        done
      );
    });

    it('can encode a string to bytes in gb2312 encoding', function (done) {
      var codec = getCodec('gb2312');
      var expected = fs.readFileSync(encodedInputPath);

      function assert(result) {
        expect(result).toEqual(expected);
      }

      pipeline(
        [from([encodedContents]), codec.encodeStream(), concatBuffer(assert)],
        done
      );
    });
  });
});
