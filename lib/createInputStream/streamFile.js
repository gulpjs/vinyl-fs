var fs = require('fs');

module.exports = function (file, cb) {
  file.contents = fs.createReadStream(file.path);
  
  // pause it so it trickles through and gets listeners
  // then dest will resume it
  file.contents.pause();

  cb(null, file);
};