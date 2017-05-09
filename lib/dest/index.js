'use strict';

var path = require('path');

var lead = require('lead');
var koalas = require('koalas');
var pumpify = require('pumpify');
var prepare = require('vinyl-prepare');
var valueOrFunction = require('value-or-function');

var fo = require('../file-operations');
var options = require('../options');
var sourcemap = require('./sourcemap');
var writeContents = require('./write-contents');

var number = valueOrFunction.number;
var string = valueOrFunction.string;
var boolean = valueOrFunction.boolean;
var stringOrBool = valueOrFunction.bind(null, ['string', 'boolean']);

function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  function resolveOptions(file) {
    // Never re-use opts
    var ourOpts = {};

    ourOpts.sourcemaps = koalas(stringOrBool(opt.sourcemaps, file), false);
    // TODO: Can this be put on file.stat?
    // TODO: default mode?
    ourOpts.dirMode = number(opt.dirMode, file);

    // TODO: Take out of vinyl-prepare???
    var defaultMode = file.stat ? file.stat.mode : null;
    ourOpts.mode = koalas(number(opt.mode, file), defaultMode);
    ourOpts.flag = koalas(boolean(opt.overwrite, file), true) ? 'w' : 'wx';
    // TODO: maybe path.resolve in vinyl-prepare??
    ourOpts.cwd = path.resolve(koalas(string(opt.cwd, file), process.cwd()));

    return ourOpts;
  }

  var saveStream = pumpify.obj(
    options.attach(resolveOptions),
    prepare.dest(outFolder, opt),
    sourcemap(),
    fo.mkdirpStream(),
    writeContents(),
    options.unattach()
  );

  // Sink the output stream to start flowing
  return lead(saveStream);
}

module.exports = dest;
