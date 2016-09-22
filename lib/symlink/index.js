'use strict';

var path = require('path');
var os = require('os');

var fs = require('graceful-fs');
var through2 = require('through2');
var valueOrFunction = require('value-or-function');
var defaultTo = require('lodash.defaultto');

var sink = require('../sink');
var prepareWrite = require('../prepare-write');

var boolean = valueOrFunction.boolean;

var isWindows = (os.platform() === 'win32');

function symlink(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  // Windows Users that are in the Administrator group cannot
  // create symlinks of type 'Directory'. It appears to be a forbidden
  // actions. This option provides a way to turn a Directory symlink
  // into a Junction on Windows. This comes with the following caveats:
  // 1) NTFS Junctions cannot be relative.
  // 2) NTFS Junctions MUST be directories.
  // 3) NTFS Junctions cannot cross network shares by default.
  // 4) NTFS Junctions CAN be created by a User that is also an Admin.
  // 5) Most products CANNOT detect a directory is a Junction.
  //    This has the side effect of possibly having a whole directory
  //    delete when a product is deleting the Junction directory.
  //    For example, IntelliJ product lines will delete the entire
  //    contents of the TARGET directory because the product does not
  //    realize it's a symlink as the JVM and Node return false for isSymlink.  
  var forceJunctionDir = (isWindows && opt.forceJunctionDir === true);

  var symDirType =  forceJunctionDir ? 'junction' : 'dir';

  function linkFile(file, enc, callback) {
    var srcPath = file.path;

    var symType = file.isDirectory() ? symDirType : 'file';

    var isRelative = defaultTo(boolean(opt.relative, file), false);

    prepareWrite(outFolder, file, opt, onPrepare);

    function onPrepare(prepareErr) {
      if (prepareErr) {
        return callback(prepareErr);
      }

      // This is done inside prepareWrite to use the adjusted file.base property
      if (isRelative) {
        srcPath = path.relative(file.base, srcPath);
      }

      fs.symlink(srcPath, file.path, symType, onSymlink);
    }

    function onSymlink(symlinkErr) {
      if (isErrorFatal(symlinkErr)) {
        return callback(symlinkErr);
      }
      callback(null, file);
    }
  }

  var stream = through2.obj(opt, linkFile);
  // Sink the stream to start flowing
  // Do this on nextTick, it will flow at slowest speed of piped streams
  process.nextTick(sink(stream));
  return stream;
}

function isErrorFatal(err) {
  if (!err) {
    return false;
  }

  // TODO: should we check file.flag like .dest()?
  if (err.code === 'EEXIST') {
    // Handle scenario for file overwrite failures.
    return false;
  }

  // Otherwise, this is a fatal error
  return true;
}

module.exports = symlink;
