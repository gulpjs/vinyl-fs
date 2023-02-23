'use strict';

var stream = require('stream');
var through = require('through2');
var expect = require('expect');

function string(length) {
  return new stream.Readable({
    read: function(size) {
      if (length <= 0) {
        return this.push(null);
      }

      var chunkSize = size <= length ? size : length;

      length -= size;

      var chunk = '';
      for (var x = 0; x < chunkSize; x++) {
        chunk += 'a';
      }

      if (this.push(chunk)) this._read(size);
    },
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
    expect(file.path).toEqual(obj.path);
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
  return new stream.Writable({
    objectMode: true,
    write: function(file, enc, cb) {
      count++;

      setTimeout(function() {
        cb(null, file);
      }, 250);
    },
    end: function(data, enc, cb) {
      expect(count).toEqual(value);
      cb();
    },
  });
}

module.exports = {
  string: string,
  rename: rename,
  includes: includes,
  count: count,
  slowCount: slowCount,
};
