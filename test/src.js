var vfs = require('../');

var path = require('path');
var fs = require('graceful-fs');

var bufEqual = require('buffer-equal');
var es = require('event-stream');
var File = require('vinyl');

var should = require('should');
require('mocha');

describe('source stream', function() {

  it('should pass through writes', function(done) {
    var expectedPath = path.join(__dirname, "./fixtures/test.coffee");
    var expectedContent = fs.readFileSync(expectedPath);

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: expectedPath,
      contents: expectedContent
    });

    var onEnd = function(){
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    };

    var stream = vfs.src("./fixtures/nothing.coffee", {cwd: __dirname});

    var buffered = [];
    bufferStream = es.through(buffered.push.bind(buffered), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
  });

  it('should glob a file with default settings', function(done) {
    var expectedPath = path.join(__dirname, "./fixtures/test.coffee");
    var expectedContent = fs.readFileSync(expectedPath);

    var onEnd = function(){
      buffered.length.should.equal(1);
      should.exist(buffered[0].stat);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isBuffer().should.equal(true);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    };

    var stream = vfs.src("./fixtures/*.coffee", {cwd: __dirname});

    var buffered = [];
    bufferStream = es.through(buffered.push.bind(buffered), onEnd);
    stream.pipe(bufferStream);
  });

  it('should glob a directory with default settings', function(done) {
    var expectedPath = path.join(__dirname, "./fixtures/wow");

    var onEnd = function(){
      buffered.length.should.equal(1);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isNull().should.equal(true);
      buffered[0].isDirectory().should.equal(true);
      done();
    };

    var stream = vfs.src("./fixtures/wow/", {cwd: __dirname});

    var buffered = [];
    bufferStream = es.through(buffered.push.bind(buffered), onEnd);
    stream.pipe(bufferStream);
  });

  it('should glob a file with read: false', function(done) {
    var expectedPath = path.join(__dirname, "./fixtures/test.coffee");
    var expectedContent = fs.readFileSync(expectedPath);

    var onEnd = function(){
      buffered.length.should.equal(1);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isNull().should.equal(true);
      should.not.exist(buffered[0].contents);
      done();
    };

    var stream = vfs.src("./fixtures/*.coffee", {cwd: __dirname, read: false});

    var buffered = [];
    bufferStream = es.through(buffered.push.bind(buffered), onEnd);
    stream.pipe(bufferStream);
  });

  it('should glob a file with buffer: false', function(done) {
    var expectedPath = path.join(__dirname, "./fixtures/test.coffee");
    var expectedContent = fs.readFileSync(expectedPath);

    var onEnd = function(){
      buffered.length.should.equal(1);
      should.exist(buffered[0].stat);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isStream().should.equal(true);
      buffered[0].contents.pipe(es.wait(function(err, content){
        should.not.exist(err);
        bufEqual(Buffer(content), expectedContent);
        done();
      }));
    };

    var stream = vfs.src("./fixtures/*.coffee", {cwd: __dirname, buffer: false});
    
    var buffered = [];
    bufferStream = es.through(buffered.push.bind(buffered), onEnd);
    stream.pipe(bufferStream);
  });

});
