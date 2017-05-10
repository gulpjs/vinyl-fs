'use strict';

var lead = require('lead');
var koalas = require('koalas');
var pumpify = require('pumpify');
var valueOrFunction = require('value-or-function');

var fo = require('../file-operations');
var options = require('../options');
var prepareWrite = require('../prepare-write');
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

  if (!outFolder) {
    throw new Error('Invalid output folder');
  }

  function resolveOptions(file) {
    // Never re-use opts
    var ourOpts = {};

    // Not from opt
    ourOpts.outFolder = string(outFolder, file);

    ourOpts.sourcemaps = koalas(stringOrBool(opt.sourcemaps, file), false);
    // TODO: Can this be put on file.stat?
    // TODO: default mode?
    ourOpts.dirMode = number(opt.dirMode, file);

    var defaultMode = file.stat ? file.stat.mode : null;
    ourOpts.mode = koalas(number(opt.mode, file), defaultMode);
    ourOpts.flag = koalas(boolean(opt.overwrite, file), true) ? 'w' : 'wx';
    ourOpts.cwd = koalas(string(opt.cwd, file), process.cwd());

    return ourOpts;
  }

  var saveStream = pumpify.obj(
    options.attach(resolveOptions),
    prepareWrite(),
    sourcemap(),
    fo.mkdirpStream(),
    writeContents(),
    options.unattach()
  );

  // Sink the output stream to start flowing
  return lead(saveStream);
}

module.exports = dest;
