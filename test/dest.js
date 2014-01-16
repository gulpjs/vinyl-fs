var vfs = require('../');

var path = require('path');
var fs = require('graceful-fs');
var rimraf = require('rimraf');

var bufEqual = require('buffer-equal');
var es = require('event-stream');
var File = require('vinyl');

var should = require('should');
require('mocha');

var wipeOut = function(cb) {
  rimraf(path.join(__dirname, "./out-fixtures/"), cb);
};

describe('dest stream', function() {
  beforeEach(wipeOut);
  afterEach(wipeOut);

  it('should pass through writes with cwd', function(done) {
    var expectedPath = path.join(__dirname, "./out-fixtures/test.coffee");

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: expectedPath,
      contents: null
    });

    var onEnd = function(){
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      done();
    };

    var stream = vfs.dest("./out-fixtures/", {cwd: __dirname});

    var buffered = [];
    bufferStream = es.through(buffered.push.bind(buffered), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should pass through writes with default cwd', function(done) {
    var expectedPath = path.join(__dirname, "./out-fixtures/test.coffee");

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: expectedPath,
      contents: null
    });

    var onEnd = function(){
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      done();
    };

    var stream = vfs.dest(path.join(__dirname, "./out-fixtures/"));

    var buffered = [];
    bufferStream = es.through(buffered.push.bind(buffered), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

});
