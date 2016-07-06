'use strict';

var filter = require('through2-filter');

function filterSince(date) {
  var isValid = typeof date === 'number' ||
    date instanceof Number ||
    date instanceof Date;

  if (!isValid) {
    throw new Error('expected since option to be a date or timestamp');
  }
  return filter.obj(function(file) {
    return file.stat && file.stat.mtime > date;
  });
};

module.exports = filterSince;
