'use strict';

var WM = require('es6-weak-map');
var through = require('through2');

// WeakMap for storing options
var options = new WM();

function attach(fn) {

  function attacher(file, enc, callback) {
    var opts = fn(file);

    options.set(file, opts);

    callback(null, file);
  }

  return through.obj(attacher);
}

function unattach() {

  function unattacher(file, enc, callback) {
    options.delete(file);

    callback(null, file);
  }

  return through.obj(unattacher);
}

function get(file, property) {
  var opts = options.get(file);

  if (!opts) {
    return;
  }

  return opts[property];
}

module.exports = {
  attach: attach,
  unattach: unattach,
  get: get,
};
