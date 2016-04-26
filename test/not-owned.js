'use strict';

var path = require('path');

var expect = require('expect');

var fs = require('graceful-fs');
var File = require('vinyl');

var vfs = require('../');

describe('.dest() on not owned files', function() {
  var outDir = path.join(__dirname, './not-owned/');
  var outPath = path.join(outDir, 'not-owned.txt');

  var dirStats = fs.statSync(outDir);
  var fileStats = fs.statSync(outPath);

  it('does not error if mtime is different', function(done) {
    if (dirStats.uid !== 0 || fileStats.uid !== 0) {
      console.log('Test files not owned by root. ' +
        'Please chown ' + outDir + ' and' + outPath + ' and try again.');
      this.skip();
      return;
    }

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: 'not-owned/not-owned.txt',
      contents: new Buffer('Something new'),
      stat: {
        mtime: new Date(Date.now() - 1000),
      },
    });

    var stream = vfs.dest(outDir);
    stream.write(expectedFile);
    stream.on('error', function(err) {
      expect(err).toNotExist();
      done(err);
    });
    stream.on('end', done);
    stream.end();
  });

  it('does not error if mode is different', function(done) {
    if (dirStats.uid !== 0 || fileStats.uid !== 0) {
      console.log('Test files not owned by root. ' +
        'Please chown ' + outDir + ' and' + outPath + ' and try again.');
      this.skip();
      return;
    }

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: 'not-owned/not-owned.txt',
      contents: new Buffer('Something new'),
      stat: {
        mode: parseInt('777', 8),
      },
    });

    var stream = vfs.dest(outDir);
    stream.write(expectedFile);
    stream.on('error', function(err) {
      expect(err).toNotExist();
      done(err);
    });
    stream.on('end', done);
    stream.end();
  });

});
