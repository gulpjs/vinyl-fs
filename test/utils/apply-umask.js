'use strict';

function applyUmask(mode) {
  if (typeof mode !== 'number') {
    mode = parseInt(mode, 8);
  }

  return mode & ~process.umask();
}

module.exports = applyUmask;
