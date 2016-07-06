'use strict';

var expect = require('expect');

var defaultValue = require('../lib/default-value');

describe('defaultVaule', function() {

  it('returns the value if the value is not null', function() {
    expect(defaultValue('defaultValue', 1)).toBe(1);
  });

  it('returns the default value if the value is undefined', function() {
    expect(defaultValue('defaultValue', undefined)).toBe('defaultValue');
  });

  it('returns the default value if the value is null', function() {
    expect(defaultValue('defaultValue', null)).toBe('defaultValue');
  });

});
