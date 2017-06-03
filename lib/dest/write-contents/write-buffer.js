'use strict';

var fo = require('../../file-operations');

function writeBuffer(file, optResolver, onWritten) {
  var opt = {
    mode: file.stat.mode,
    flag: optResolver.resolve('flag', file),
  };

  fo.writeFile(file.path, file.contents, opt, onWriteFile);

  function onWriteFile(writeErr, fd) {
    if (writeErr) {
      return fo.closeFd(writeErr, fd, onWritten);
    }

    fo.updateMetadata(fd, file, onUpdate);

    function onUpdate(updateErr) {
      fo.closeFd(updateErr, fd, onWritten);
    }
  }

}

module.exports = writeBuffer;
