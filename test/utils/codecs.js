"use strict";

var assert = require("node:assert");

function checkCodec(codec) {
  assert.strictEqual(typeof codec, "object");
  assert.strictEqual(codec.constructor.name, "Codec");
  assert.strictEqual(typeof codec.enc, "string");
  assert.strictEqual(typeof codec.bomAware, "boolean");
  assert.strictEqual(typeof codec.encode, "function");
  assert.strictEqual(typeof codec.encodeStream, "function");
  assert.strictEqual(typeof codec.decode, "function");
  assert.strictEqual(typeof codec.decodeStream, "function");
}

module.exports = checkCodec;
