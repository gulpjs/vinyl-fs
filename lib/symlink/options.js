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
  flag: {
    type: 'string',
    default: function(file) {
      var overwrite = this.resolve('overwrite', file);
      return (overwrite ? 'w': 'wx');
    },
  },
};

module.exports = config;
