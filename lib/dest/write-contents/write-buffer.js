'use strict';

var fo = require('../../file-operations');

function writeBuffer(file, onWritten) {
  var opt = {
    mode: file.stat.mode,
    flag: file.flag,
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
