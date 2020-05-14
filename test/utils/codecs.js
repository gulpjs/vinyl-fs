'use strict';

var expect = require('expect');

function checkCodec(codec) {
  expect(typeof codec).toEqual('object');
  expect(codec.constructor.name).toEqual('Codec');
  expect(typeof codec.enc).toEqual('string');
  expect(typeof codec.bomAware).toEqual('boolean');
  expect(typeof codec.encode).toEqual('function');
  expect(typeof codec.encodeStream).toEqual('function');
  expect(typeof codec.decode).toEqual('function');
  expect(typeof codec.decodeStream).toEqual('function');
}

module.exports = checkCodec;
