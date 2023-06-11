'use strict';

var os = require('os');

var isWindows = os.platform() === 'win32';

module.exports = isWindows;
