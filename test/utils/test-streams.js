'use strict';

var miss = require('mississippi');
var expect = require('expect');

var to = miss.to;
var through = miss.through;

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

module.exports = {
  rename: rename,
  includes: includes,
  count: count,
  slowCount: slowCount,
};
