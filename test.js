var assert = require('assert');
var PlaygroundIO = require('./lib');

describe('PlaygroundIO', function () {
  describe('#parseFirmataFloat()', function () {
    it('should parse floats from 7-bit byte firmata responses', function () {
      assert.equal(0.220320343971, PlaygroundIO.parseFirmataFloat([40, 1, 27, 1, 97, 0, 62, 0]).toFixed(12));
      assert.equal(-0.134108036757, PlaygroundIO.parseFirmataFloat([30, 1, 83, 0, 9, 0, 62, 1]).toFixed(12));
      assert.equal(13.008480072, PlaygroundIO.parseFirmataFloat([60, 1, 34, 0, 80, 0, 65, 0]).toFixed(9));
    });
  });

  describe('#parseFirmataLong()', function () {
    it('should parse longs from 7-bit byte firmata responses', function () {
      assert.equal(4, PlaygroundIO.parseFirmataLong([4, 0, 0, 0, 0, 0, 0, 0]));
    });
  });

  describe('#parseFirmataByte()', function () {
    it('should convert', function () {
      assert.equal(10, PlaygroundIO.parseFirmataByte([10, 0]));
    });
  });
});
