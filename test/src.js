var vfs = require('../');

var path = require('path');
var fs = require('fs');

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

    var stream = vfs.src("./fixtures/nothing.coffee", {cwd: __dirname});
    var buffered = [];

    stream.on('error', done);
    stream.on('data', function(file) {
      buffered.push(file);
    });
    stream.on('end', function(){
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    });
    stream.write(expectedFile);
  });

  it('should glob a file with default settings', function(done) {
    var expectedPath = path.join(__dirname, "./fixtures/test.coffee");
    var expectedContent = fs.readFileSync(expectedPath);

    var stream = vfs.src("./fixtures/*.coffee", {cwd: __dirname});
    var buffered = [];

    stream.on('error', done);
    stream.on('data', function(file) {
      buffered.push(file);
    });
    stream.on('end', function(){
      buffered.length.should.equal(1);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isBuffer().should.equal(true);
      bufEqual(buffered[0].contents, expectedContent).should.equal(true);
      done();
    });
  });

  it('should glob a file with read: false', function(done) {
    var expectedPath = path.join(__dirname, "./fixtures/test.coffee");
    var expectedContent = fs.readFileSync(expectedPath);

    var stream = vfs.src("./fixtures/*.coffee", {cwd: __dirname, read: false});
    var buffered = [];

    stream.on('error', done);
    stream.on('data', function(file) {
      buffered.push(file);
    });
    stream.on('end', function(){
      buffered.length.should.equal(1);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isNull().should.equal(true);
      should.not.exist(buffered[0].contents);
      done();
    });
  });

  it('should glob a file with buffer: false', function(done) {
    var expectedPath = path.join(__dirname, "./fixtures/test.coffee");
    var expectedContent = fs.readFileSync(expectedPath);

    var stream = vfs.src("./fixtures/*.coffee", {cwd: __dirname, buffer: false});
    var buffered = [];

    stream.on('error', done);
    stream.on('data', function(file) {
      buffered.push(file);
    });
    stream.on('end', function(){
      buffered.length.should.equal(1);
      buffered[0].path.should.equal(expectedPath);
      buffered[0].isStream().should.equal(true);
      buffered[0].contents.pipe(es.wait(function(err, content){
        should.not.exist(err);
        bufEqual(Buffer(content), expectedContent);
        done();
      }));
      buffered[0].contents.resume();
    });
  });

});
