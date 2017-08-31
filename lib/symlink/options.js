'use strict';

var config = {
  // This option is ignored on non-Windows platforms
  useJunctions: {
    type: 'boolean',
    default: true,
  },
  relativeSymlinks: {
    type: 'boolean',
    default: false,
  },
  cwd: {
    type: 'string',
    default: process.cwd,
  },
  dirMode: {
    type: 'number',
  },
  overwrite: {
    type: 'boolean',
    default: true,
  },
};

module.exports = config;
