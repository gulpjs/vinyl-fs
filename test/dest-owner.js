'use strict';

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');
var sinon = require('sinon');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var isWindows = require('./utils/is-windows');
var testConstants = require('./utils/test-constants');

var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var contents = testConstants.contents;

var clean = cleanup(outputBase);

function suite(moduleName) {
  var stream = require(moduleName);

  var from = stream.Readable.from;

  describe('.dest() with custom owner (with ' + moduleName + ')', function () {
    beforeEach(clean);
    afterEach(clean);

    it('calls fchown when the uid and/or gid are provided on the vinyl stat', function (done) {
      if (isWindows) {
        this.skip();
        return;
      }

      var fchownSpy = sinon.spy(fs, 'fchown');

      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
        stat: {
          uid: 1001,
          gid: 1001,
        },
      });

      function assert() {
        expect(fchownSpy.callCount).toEqual(1);
        expect(fchownSpy.getCall(0).args[1]).toEqual(1001);
        expect(fchownSpy.getCall(0).args[2]).toEqual(1001);
        done();
      }

      stream.pipeline([from([file]), vfs.dest(outputBase)], assert);
    });

    it('does not call fchown when the uid and gid provided on the vinyl stat are invalid', function (done) {
      if (isWindows) {
        this.skip();
        return;
      }

      var fchownSpy = sinon.spy(fs, 'fchown');

      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: Buffer.from(contents),
        stat: {
          uid: -1,
          gid: -1,
        },
      });

      function assert() {
        expect(fchownSpy.callCount).toEqual(0);
        done();
      }

      stream.pipeline([from([file]), vfs.dest(outputBase)], assert);
    });
  });
}

suite('stream');
suite('streamx');
suite('readable-stream');
