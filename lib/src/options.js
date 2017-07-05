'use strict';

var config = {
  buffer: {
    type: 'boolean',
    default: true,
  },
  read: {
    type: 'boolean',
    default: true,
  },
  since: {
    type: 'date',
  },
  removeBOM: {
    type: 'boolean',
    default: true,
  },
  encoding: {
    type: 'string',
    default: 'utf8',
  },
  sourcemaps: {
    type: 'boolean',
    default: false,
  },
  resolveSymlinks: {
    type: 'boolean',
    default: true,
  },
};

module.exports = config;
