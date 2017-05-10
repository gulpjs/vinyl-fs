'use strict';

var fo = require('../../file-operations');
var options = require('../../options');

function writeBuffer(file, onWritten) {
  var opt = {
    mode: file.stat.mode,
    flag: options.get(file, 'flag'),
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
