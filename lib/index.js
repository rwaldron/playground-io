var Board = require("firmata");

var CP_COMMAND = 0x40;
var CP_PIXEL_SET = 0x10;
var CP_PIXEL_SHOW = 0x11;
var CP_PIXEL_CLEAR = 0x12;
var CP_TONE        = 0x20;
var CP_NO_TONE     = 0x21;

function Playground(options) {
  Board.call(this, options.port);
}

Playground.prototype = Object.create(Board.prototype, {
  constructor: {
    value: Playground
  }
});

Playground.Pixel = {
  initialize: {
    value: function(opts) {}
  },
  write: {
    writable: true,
    value: function(colors) {
      // Pack 14-bits into 2 7-bit bytes.
      colors.red &= 0xFF;
      colors.green &= 0xFF;
      colors.blue &= 0xFF;
      this.pin &= 0x7F;

      var b1 = colors.red >> 1;
      var b2 = ((colors.red & 0x01) << 6) | (colors.green >> 2);
      var b3 = ((colors.green & 0x03) << 5) | (colors.blue >> 3);
      var b4 = (colors.blue & 0x07) << 4;

      this.io.sysexCommand([CP_COMMAND, CP_PIXEL_SET, this.pin, b1, b2, b3, b4]);
      this.io.sysexCommand([CP_COMMAND, CP_PIXEL_SHOW]);
    }
  }
};

Playground.Piezo = {
  frequency: {
    value: function(frequencyHz, durationMs) {
      durationMs = durationMs || 0;
      // Pack 14-bits into 2 7-bit bytes.
      frequencyHz &= 0x3FFF;
      var f1 = frequencyHz & 0x7F;
      var f2 = frequencyHz >> 7;
      durationMs &= 0x3FFF;
      var d1 = durationMs & 0x7F;
      var d2 = durationMs >> 7;

      this.io.sysexCommand([CP_COMMAND, CP_TONE, f1, f2, d1, d2]);
    }
  },
  noTone: {
    value: function() {
      this.io.sysexCommand([CP_COMMAND, CP_NO_TONE]);
    }
  }
};

module.exports = Playground;
