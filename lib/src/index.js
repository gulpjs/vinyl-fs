var map = require('map-stream');
var gs = require('glob-stream');

var File = require('vinyl');
var getContents = require('./getContents');
var getStats = require('./getStats');

module.exports = function(glob, opt) {
  if (!opt) opt = {};
  if (typeof opt.read !== 'boolean') opt.read = true;
  if (typeof opt.buffer !== 'boolean') opt.buffer = true;
  if (!glob) throw new Error("Invalid glob for .src(): " + glob);

  var globStream = gs.create(glob, opt);
  var formatStream = map(function(file, cb){
    cb(null, new File(file));
  });

  var stream = globStream
    .pipe(formatStream)
    .pipe(getStats(opt));

  if (!opt.read) return stream; // no reading required

  return stream.pipe(getContents(opt));
};
