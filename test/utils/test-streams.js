'use strict';

var expect = require('expect');

module.exports = function makeUtils(stream) {
  function chunks(length) {
    var arr = new Array(length);
    arr.fill('a');
    return stream.Readable.from(arr);
  }

  function rename(filepath) {
    return new stream.Transform({
      objectMode: true,
      transform: function (file, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }

        file.path = filepath;
        cb(null, file);
      },
    });
  }

  function includes(obj) {
    return new stream.Transform({
      objectMode: true,
      transform: function (file, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }

        expect(file.path).toEqual(obj.path);
        cb(null, file);
      },
    });
  }

  function count(value) {
    var count = 0;
    return new stream.Transform({
      objectMode: true,
      transform: function (file, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }

        count++;
        cb(null, file);
      },
      flush: function (cb) {
        expect(count).toEqual(value);
        cb();
      },
    });
  }

  function slowCount(value) {
    var count = 0;
    return new stream.Writable({
      objectMode: true,
      write: function (file, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }

        count++;

        setTimeout(function () {
          cb(null, file);
        }, 250);
      },
      end: function (data, enc, cb) {
        expect(count).toEqual(value);
        cb();
      },
    });
  }

  function concatString(fn, timeout) {
    var collect = '';
    return new stream.Writable({
      objectMode: true,
      write: function (chunk, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }
        setTimeout(function () {
          collect = collect + chunk;
          cb();
        }, timeout || 1);
      },
      final: function (cb) {
        if (typeof fn === 'function') {
          fn(collect);
        }

        cb();
      },
    });
  }

  function concatBuffer(fn, timeout) {
    var collect = Buffer.alloc(0);
    return new stream.Writable({
      objectMode: true,
      write: function (chunk, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }
        setTimeout(function () {
          collect = Buffer.concat([collect, chunk]);
          cb();
        }, timeout || 1);
      },
      final: function (cb) {
        if (typeof fn === 'function') {
          fn(collect);
        }

        cb();
      },
    });
  }

  function concatArray(fn, timeout) {
    var collect = [];
    return new stream.Writable({
      objectMode: true,
      write: function (chunk, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }
        setTimeout(function () {
          collect.push(chunk);
          cb();
        }, timeout || 1);
      },
      final: function (cb) {
        if (typeof fn === 'function') {
          fn(collect);
        }

        cb();
      },
    });
  }

  function compareContents(comparator) {
    return new stream.Transform({
      objectMode: true,
      transform: function (file, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }
        stream.pipeline(
          [file.contents, concatBuffer(comparator)],
          function (err) {
            cb(err, file);
          }
        );
      },
    });
  }

  return {
    chunks: chunks,
    rename: rename,
    includes: includes,
    count: count,
    slowCount: slowCount,
    concatString: concatString,
    concatBuffer: concatBuffer,
    concatArray: concatArray,
    compareContents: compareContents,
  };
};
