'use strict';

var os = require('os');

var isWindows = (os.platform() === 'win32');

var config = {
  cwd: {
    type: 'string',
    default: process.cwd,
  },
  mode: {
    type: 'number',
    default: function(file) {
      return file.stat ? file.stat.mode : null;
    },
  },
  dirMode: {
    type: 'number',
  },
  overwrite: {
    type: 'boolean',
    default: true,
  },
  flag: {
    type: 'string',
    default: function(file) {
      var overwrite = this.resolve('overwrite', file);
      return (overwrite ? 'w': 'wx');
    },
  },
  sourcemaps: {
    type: ['string', 'boolean'],
    default: false,
  },
  // Symlink options
  useJunctions: {
    type: 'boolean',
    default: isWindows,
  },
  relative: {
    type: 'boolean',
    default: false,
  },
};

module.exports = config;
