'use strict';

var expect = require('expect');

var getCodec = require('../lib/codecs');

describe('codecs', function() {

  it('exports a function', function(done) {
    expect(typeof getCodec).toEqual('function');
    done();
  });

  it('returns an object for \'utf8\'', function(done) {
    var codec = getCodec('utf8');
    expect(typeof codec).toEqual('object');
    done();
  });

  it('returns an object for \'utf8\' with an enc property', function(done) {
    var codec = getCodec('utf8');
    expect(codec.enc).toEqual('utf8');
    done();
  });

  it('returns an object for \'utf8\' with a bomAware property', function(done) {
    var codec = getCodec('utf8');
    expect(codec.bomAware).toEqual(true);
    done();
  });

  it('returns an object for \'utf16be\'', function(done) {
    var codec = getCodec('utf16be');
    expect(typeof codec).toEqual('object');
    done();
  });

  it('returns an object for \'utf16be\' with a bomAware property', function(done) {
    var codec = getCodec('utf16be');
    expect(codec.bomAware).toEqual(true);
    done();
  });

  it('returns an object for \'utf16le\'', function(done) {
    var codec = getCodec('utf16le');
    expect(typeof codec).toEqual('object');
    done();
  });

  it('returns an object for \'utf16le\' with a bomAware property', function(done) {
    var codec = getCodec('utf16le');
    expect(codec.bomAware).toEqual(true);
    done();
  });

  it('returns undefined for unsupported encoding', function(done) {
    var codec = getCodec('fubar42');
    expect(codec).toNotExist();
    done();
  });
});
