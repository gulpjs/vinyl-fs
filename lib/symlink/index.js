'use strict';

var path = require('path');
var os = require('os');

var fs = require('graceful-fs');
var through2 = require('through2');
var valueOrFunction = require('value-or-function');
var koalas = require('koalas');

var sink = require('../sink');
var prepareWrite = require('../prepare-write');

var boolean = valueOrFunction.boolean;

var isWindows = (os.platform() === 'win32');

function symlink(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  function linkFile(file, enc, callback) {
    var srcPath = file.path;

    var isDirectory = file.isDirectory();

    // This option provides a way to create a Junction instead of a
    // Directory symlink on Windows. This comes with the following caveats:
    // * NTFS Junctions cannot be relative.
    // * NTFS Junctions MUST be directories.
    // * NTFS Junctions must be on the same file system.
    // * Most products CANNOT detect a directory is a Junction:
    //    This has the side effect of possibly having a whole directory
    //    deleted when a product is deleting the Junction directory.
    //    For example, IntelliJ product lines will delete the entire
    //    contents of the TARGET directory because the product does not
    //    realize it's a symlink as the JVM and Node return false for isSymlink.
    var useJunctions = koalas(boolean(opt.useJunctions, file), (isWindows && isDirectory));

    var symDirType =  useJunctions ? 'junction' : 'dir';
    var symType = isDirectory ? symDirType : 'file';
    var isRelative = koalas(boolean(opt.relative, file), false);

    prepareWrite(outFolder, file, opt, onPrepare);

    function onPrepare(prepareErr) {
      if (prepareErr) {
        return callback(prepareErr);
      }

      // This is done inside prepareWrite to use the adjusted file.base property
      if (isRelative && !useJunctions) {
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
