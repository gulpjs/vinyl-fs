'use strict';

var fs = require('fs');

function invalidFD() {
  var fd = 1 << 30;

  try {
    while (fd > 0 && fs.fstatSync(fd)) {
      fd--;
    }
  } finally {
    return fd;
  }
}

module.exports = invalidFD;
