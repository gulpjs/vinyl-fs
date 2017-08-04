'use strict';

var miss = require('mississippi');
var expect = require('expect');
var isWindows = require('./is-windows');

var to = miss.to;
var from = miss.from;
var through = miss.through;
var pipe = miss.pipe;

function string(length) {
  return from(function(size, next) {
    if (length <= 0) {
      next(null, null);
      return;
    }

    var chunkSize = size <= length ? size : length;

    length -= size;

    var chunk = '';
    for (var x = 0; x < chunkSize; x++) {
      chunk += 'a';
    }

    next(null, chunk);
  });
}

function rename(filepath) {
  return through.obj(function(file, enc, cb) {
    file.path = filepath;
    cb(null, file);
  });
}

function includes(obj) {
  return through.obj(function(file, enc, cb) {
    expect(file).toInclude(obj);
    cb(null, file);
  });
}

function count(value) {
  var count = 0;
  return through.obj(function(file, enc, cb) {
    count++;
    cb(null, file);
  }, function(cb) {
    expect(count).toEqual(value);
    cb();
  });
}

function slowCount(value) {
  var count = 0;
  return to.obj(function(file, enc, cb) {
    count++;

    setTimeout(function() {
      cb(null, file);
    }, 250);
  }, function(cb) {
    expect(count).toEqual(value);
    cb();
  });
}

/*
 * Creates a transform stream which joins objects from an object stream into an array.
 * At end-of-stream, optional callback is invoked with array of collected objects.
 */
function join(cb) {
  var array = [];

  var transform = to.obj(function(file, enc, done) { // Chunk
    array.push(file);
    done();
  }, function(done) { // Flush
    cb && cb(array);  // Invoke callback with saved context
    done();
  });

  return transform;
}

function reportWarningAndSkip(ctx, err) {
  if (isWindows && err && err.code === 'EPERM' && err.message.match(/symlink/) &&
    ctx && typeof ctx.skip === 'function') {
    console.warn('      Warning: skipping due to EPERM error calling symlink:');
    ctx.skip();
    return true;
  }
  return false;
}

/*
** Accepts an set of streams, pipes them together, and pipe objects through them
** Reports EPERM errors as warnings on Windows and mark test pending.
*/
function mochaPump(ctx, streams, callback) {
  if (!ctx || typeof ctx.skip !== 'function') {
    throw new Error('first argument should be this from test');
  }
  if (!Array.isArray(streams)) {
    throw new Error('second argument should be array of streams');
  }

  return pipe(streams, function(err) {
    if (reportWarningAndSkip(ctx, err)) {
      callback && callback();
    } else {
      callback && callback(err);
    }
  });
}

module.exports = {
  string: string,
  rename: rename,
  includes: includes,
  count: count,
  slowCount: slowCount,
  join: join,
  mochaPump: mochaPump,
  reportWarningAndSkip: reportWarningAndSkip,
};
