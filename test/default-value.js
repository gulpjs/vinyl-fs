'use strict';

var expect = require('expect');

var defaultValue = require('../lib/default-value');

describe('defaultVaule', function() {

  it('returns the value if the value is not null', function(done) {
    expect(defaultValue('defaultValue', 1)).toBe(1);
    done();
  });

  it('returns the default value if the value is undefined', function(done) {
    expect(defaultValue('defaultValue', undefined)).toBe('defaultValue');
    done();
  });

  it('returns the default value if the value is null', function(done) {
    expect(defaultValue('defaultValue', null)).toBe('defaultValue');
    done();
  });

});
