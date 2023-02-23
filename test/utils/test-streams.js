'use strict';

var miss = require('mississippi');
var expect = require('expect');

var to = miss.to;
var from = miss.from;
var through = miss.through;

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

module.exports = {
  string: string,
  rename: rename,
  includes: includes,
  count: count,
  slowCount: slowCount,
};
