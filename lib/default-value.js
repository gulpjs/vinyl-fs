'use strict';

function defaultValue(defVal, value) {
  // Double equal to support null & undefined
  return value == null ? defVal : value;
}

module.exports = defaultValue;
