'use strict';

var path = require('path');

// Input/output relative paths
var inputRelative = './fixtures';
var outputRelative = './out-fixtures';
// Input/Output base directories
var inputBase = path.join(__dirname, '..', inputRelative);
var outputBase = path.join(__dirname, '..', outputRelative);
// Used for file tests
var inputPath = path.join(inputBase, './test.txt');
var outputPath = path.join(outputBase, './test.txt');
// Used for directory tests
var inputDirpath = path.join(inputBase, './foo');
var outputDirpath = path.join(outputBase, './foo');
// Used for nested tests
var inputNestedPath = path.join(inputDirpath, './test.txt');
var outputNestedPath = path.join(outputDirpath, './test.txt');
// Used for rename tests
var outputRenamePath = path.join(outputBase, './foo2.txt');
// Used for not-owned tests
var notOwnedBase = path.join(inputBase, './not-owned/');
var notOwnedPath = path.join(notOwnedBase, 'not-owned.txt');
// Used for BOM tests
var bomInputPath = path.join(inputBase, './bom-utf8.txt');
var beEncodedInputPath = path.join(inputBase, './bom-utf16be.txt');
var leEncodedInputPath = path.join(inputBase, './bom-utf16le.txt');
// Used for symlink tests
var symlinkNestedTarget = path.join(inputBase, './foo/bar/baz.txt');
var symlinkPath = path.join(outputBase, './test-symlink');
var symlinkDirpath = path.join(outputBase, './test-symlink-dir');
var symlinkMultiDirpath = path.join(outputBase, './test-multi-layer-symlink-dir');
var symlinkMultiDirpathSecond = path.join(outputBase, './test-multi-layer-symlink-dir2');
var symlinkNestedFirst = path.join(outputBase, './test-multi-layer-symlink');
var symlinkNestedSecond = path.join(outputBase, './foo/baz-link.txt');
// Used for contents of files
var contents = 'Hello World!\n';
var sourcemapContents = '//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9maXh0dXJlcyIsIm5hbWVzIjpbXSwibWFwcGluZ3MiOiIiLCJzb3VyY2VzIjpbIi4vZml4dHVyZXMiXSwic291cmNlc0NvbnRlbnQiOlsiSGVsbG8gV29ybGQhXG4iXX0=';

module.exports = {
  inputRelative: inputRelative,
  outputRelative: outputRelative,
  inputBase: inputBase,
  outputBase: outputBase,
  inputPath: inputPath,
  outputPath: outputPath,
  inputDirpath: inputDirpath,
  outputDirpath: outputDirpath,
  inputNestedPath: inputNestedPath,
  outputNestedPath: outputNestedPath,
  outputRenamePath: outputRenamePath,
  notOwnedBase: notOwnedBase,
  notOwnedPath: notOwnedPath,
  bomInputPath: bomInputPath,
  beEncodedInputPath: beEncodedInputPath,
  leEncodedInputPath: leEncodedInputPath,
  symlinkNestedTarget: symlinkNestedTarget,
  symlinkPath: symlinkPath,
  symlinkDirpath: symlinkDirpath,
  symlinkMultiDirpath: symlinkMultiDirpath,
  symlinkMultiDirpathSecond: symlinkMultiDirpathSecond,
  symlinkNestedFirst: symlinkNestedFirst,
  symlinkNestedSecond: symlinkNestedSecond,
  contents: contents,
  sourcemapContents: sourcemapContents,
};
