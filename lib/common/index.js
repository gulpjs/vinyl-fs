var assign = require('object-assign');
var path = require('path');
var mkdirp = require('mkdirp');
var fs = require('graceful-fs');

exports.prepDestAndResponse = function (outFolder, file, opt, cb) {
  opt = opt || {};

  var options = assign({
    cwd: process.cwd()
  }, opt);

  var cwd = path.resolve(options.cwd);

  if (typeof outFolder !== 'string' && typeof outFolder !== 'function') {
    throw new Error('Invalid output folder');
  }

  var basePath;
  if (typeof outFolder === 'string') {
    basePath = path.resolve(cwd, outFolder);
  }
  if (typeof outFolder === 'function') {
    basePath = path.resolve(cwd, outFolder(file));
  }

  var writePath = path.resolve(basePath, file.relative);
  var writeFolder = path.dirname(writePath);

  // wire up new properties
  file.stat = file.stat ? file.stat : new fs.Stats();
  file.stat.mode = (options.mode || file.stat.mode);
  file.cwd = cwd;
  file.base = basePath;
  file.path = writePath;

  // mkdirp the folder the file is going in
  mkdirp(writeFolder, function(err){
    if (err) {
      return cb(err);
    }
    cb(null, writePath);
  });
};
