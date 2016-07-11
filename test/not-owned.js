'use strict';

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');
var miss = require('mississippi');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var applyUmask = require('./utils/apply-umask');
var testConstants = require('./utils/test-constants');

var from = miss.from;
var pipe = miss.pipe;
var concat = miss.concat;

var notOwnedBase = testConstants.notOwnedBase;
var notOwnedPath = testConstants.notOwnedPath;
var contents = testConstants.contents;

var clean = cleanup();

describe('.dest() on not owned files', function() {

  var dirStats = fs.statSync(notOwnedBase);
  var fileStats = fs.statSync(notOwnedPath);

  beforeEach(clean);
  afterEach(clean);

  it('does not error if mtime is different', function(done) {
    if (dirStats.uid !== 0 || fileStats.uid !== 0) {
      console.log('Test files not owned by root.');
      console.log('Please chown ' + notOwnedBase + ' and' + notOwnedPath + ' and try again.');
      this.skip();
      return;
    }

    var futimesSpy = expect.spyOn(fs, 'futimes').andCallThrough();

    var earlier = Date.now() - 1000;

    var file = new File({
      base: notOwnedBase,
      path: notOwnedPath,
      contents: new Buffer(contents),
      stat: {
        mtime: new Date(earlier),
      },
    });

    function assert() {
      expect(futimesSpy.calls.length).toEqual(0);
    }

    pipe([
      from.obj([file]),
      vfs.dest(notOwnedBase),
      concat(assert),
    ], done);
  });

  it('does not error if mode is different', function(done) {
    if (dirStats.uid !== 0 || fileStats.uid !== 0) {
      console.log('Test files not owned by root.');
      console.log('Please chown ' + notOwnedBase + ' and' + notOwnedPath + ' and try again.');
      this.skip();
      return;
    }

    var fchmodSpy = expect.spyOn(fs, 'fchmod').andCallThrough();

    var file = new File({
      base: notOwnedBase,
      path: notOwnedPath,
      contents: new Buffer(contents),
      stat: {
        mode: applyUmask('777'),
      },
    });

    function assert() {
      expect(fchmodSpy.calls.length).toEqual(0);
    }

    pipe([
      from.obj([file]),
      vfs.dest(notOwnedBase),
      concat(assert),
    ], done);
  });
});
