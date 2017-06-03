'use strict';

var path = require('path');

var fs = require('graceful-fs');
var pumpify = require('pumpify');
var through = require('through2');
var lead = require('lead');
var mkdirpStream = require('fs-mkdirp-stream');
var createResolver = require('resolve-options');

var fo = require('../file-operations');

var config = require('./options');
var prepare = require('./prepare');

var folderConfig = {
  outFolder: {
    type: 'string',
  },
};

function symlink(outFolder, opt) {
  var optResolver = createResolver(config, opt);
  var folderResolver = createResolver(folderConfig, { outFolder: outFolder });

  function linkFile(file, enc, callback) {
    // Fetch the path as it was before prepare.dest()
    var srcPath = file.history[file.history.length - 2];

    var isDirectory = file.isDirectory();

    // This option provides a way to create a Junction instead of a
    // Directory symlink on Windows. This comes with the following caveats:
    // * NTFS Junctions cannot be relative.
    // * NTFS Junctions MUST be directories.
    // * NTFS Junctions must be on the same file system.
    // * Most products CANNOT detect a directory is a Junction:
    //    This has the side effect of possibly having a whole directory
    //    deleted when a product is deleting the Junction directory.
    //    For example, JetBrains product lines will delete the entire
    //    contents of the TARGET directory because the product does not
    //    realize it's a symlink as the JVM and Node return false for isSymlink.
    var useJunctions = optResolver.resolve('useJunctions', file);

    var symDirType =  useJunctions ? 'junction' : 'dir';
    var symType = isDirectory ? symDirType : 'file';
    var isRelative = optResolver.resolve('relative', file);

    // This is done inside prepareWrite to use the adjusted file.base property
    if (isRelative && !useJunctions) {
      srcPath = path.relative(file.base, srcPath);
    }

    // Because fs.symlink does not allow atomic overwrite option with flags, we
    // delete and recreate if the link already exists and overwrite is true.
    var flag = optResolver.resolve('flag', file);
    if (flag === 'w') {
      // TODO What happens when we call unlink with windows junctions?
      fs.unlink(file.path, onUnlink);
    } else {
      fs.symlink(srcPath, file.path, symType, onSymlink);
    }

    function onUnlink(unlinkErr) {
      if (fo.isFatalUnlinkError(unlinkErr)) {
        return callback(unlinkErr);
      }
      fs.symlink(srcPath, file.path, symType, onSymlink);
    }

    function onSymlink(symlinkErr) {
      if (fo.isFatalOverwriteError(symlinkErr, flag)) {
        return callback(symlinkErr);
      }
      callback(null, file);
    }
  }

  function dirpath(file, callback) {
    var dirMode = optResolver.resolve('dirMode', file);

    callback(null, file.dirname, dirMode);
  }

  var stream = pumpify.obj(
    prepare(folderResolver, optResolver),
    mkdirpStream.obj(dirpath),
    through.obj(linkFile)
  );

  // Sink the stream to start flowing
  return lead(stream);
}

module.exports = symlink;
