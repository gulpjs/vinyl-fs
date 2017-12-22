'use strict';

var File = require('vinyl');

function breakPrototype(file) {
  // Set up a broken prototype
  var oldProto = {};
  Object.getOwnPropertyNames(File.prototype).forEach(function(key) {
    if (key !== 'isSymbolic') {
      var desc = Object.getOwnPropertyDescriptor(File.prototype, key);
      Object.defineProperty(oldProto, key, desc);
    }
  });

  // Assign the broken prototype to our instance
  if (typeof Object.setPrototypeOf === 'function') {
    Object.setPrototypeOf(file, oldProto);
  } else {
    file.__proto__ = oldProto;
  }
}

module.exports = breakPrototype;
