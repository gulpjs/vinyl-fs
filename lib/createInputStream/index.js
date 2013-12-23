var es = require('event-stream');
var gs = require('glob-stream');

var File = require('gulp-util').File;
var getContents = require('./getContents');
var getStats = require('./getStats');

module.exports = function(glob, opt) {
  if (!opt) opt = {};
  if (typeof opt.read !== 'boolean') opt.read = true;
  if (typeof opt.buffer !== 'boolean') opt.buffer = true;

  var globStream = gs.create(glob, opt);
  var formatStream = es.map(function(file, cb){
    cb(null, new File(file));
  });

  var stream = globStream
    .pipe(formatStream)
    .pipe(getStats(opt));

  if (!opt.read) return stream; // no reading required

  return stream.pipe(getContents(opt));
};
