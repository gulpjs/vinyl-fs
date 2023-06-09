'use strict';

var fs = require('graceful-fs');
var File = require('vinyl');
var expect = require('expect');
var sinon = require('sinon');

var vfs = require('../');

var cleanup = require('./utils/cleanup');
var applyUmask = require('./utils/apply-umask');
var testStreams = require('./utils/test-streams');
var testConstants = require('./utils/test-constants');
var describeStreams = require('./utils/suite');

var notOwnedBase = testConstants.notOwnedBase;
var notOwnedPath = testConstants.notOwnedPath;
var contents = testConstants.contents;

var clean = cleanup();

describeStreams('.dest() on not owned files', function (stream) {
  var from = stream.Readable.from;
  var pipeline = stream.pipeline;

  var streamUtils = testStreams(stream);
  var concatArray = streamUtils.concatArray;

  var fileStats = fs.statSync(notOwnedPath);

  beforeEach(clean);
  afterEach(clean);

  var seenActions = false;

  function needsAction() {
    var problems = [];
    var actions = [];
    if (fileStats.uid !== 0) {
      problems.push('Test files not owned by root.');
      actions.push('  sudo chown root ' + notOwnedPath);
    }
    if ((fileStats.mode & parseInt('022', 8)) !== parseInt('022', 8)) {
      problems.push('Test files not readable/writable by non-owners.');
      actions.push('  sudo chmod 666 ' + notOwnedPath);
    }
    if (actions.length > 0) {
      if (!seenActions) {
        console.log(problems.join('\n'));
        console.log('Please run the following commands and try again:');
        console.log(actions.join('\n'));
        seenActions = true;
      }
      return true;
    }
    return false;
  }

  it('does not error if mtime is different', function (done) {
    if (needsAction()) {
      this.skip();
      return;
    }

    var futimesSpy = sinon.spy(fs, 'futimes');

    var earlier = Date.now() - 1000;

    var file = new File({
      base: notOwnedBase,
      path: notOwnedPath,
      contents: Buffer.from(contents),
      stat: {
        mtime: new Date(earlier),
      },
    });

    function assert() {
      expect(futimesSpy.callCount).toEqual(0);
    }

    pipeline([from([file]), vfs.dest(notOwnedBase), concatArray(assert)], done);
  });

  it('does not error if mode is different', function (done) {
    if (needsAction()) {
      this.skip();
      return;
    }

    var fchmodSpy = sinon.spy(fs, 'fchmod');

    var file = new File({
      base: notOwnedBase,
      path: notOwnedPath,
      contents: Buffer.from(contents),
      stat: {
        mode: applyUmask('777'),
      },
    });

    function assert() {
      expect(fchmodSpy.callCount).toEqual(0);
    }

    pipeline([from([file]), vfs.dest(notOwnedBase), concatArray(assert)], done);
  });
});
