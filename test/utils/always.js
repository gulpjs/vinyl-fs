'use strict';

function always(value) {
  return function () {
    return value;
  };
}

module.exports = always;
