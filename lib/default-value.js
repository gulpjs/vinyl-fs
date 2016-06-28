'use strict';

module.exports = function defaultValue(defaultValue, value) {
  return value === null ? defaultValue : value;
};
