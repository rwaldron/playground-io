var Board = require("firmata");

var CP_COMMAND = 0x40;
var CP_PIXEL_SET = 0x10;
var CP_PIXEL_SHOW = 0x11;
var CP_PIXEL_CLEAR = 0x12;

function Playground(options) {
  Board.call(this, options.port);
}

Playground.prototype = Object.create(Board.prototype, {
  constructor: {
    value: Playground
  }
});

Playground.Neopixel = {
  initialize: {
    value: function(opts) {}
  },
  write: {
    writable: true,
    value: function(colors) {
      var b1 = colors.red >> 1;
      var b2 = ((colors.red & 0x01) << 6) | (colors.green >> 2);
      var b3 = ((colors.green & 0x03) << 5) | (colors.blue >> 3);
      var b4 = (colors.blue & 0x07) << 4;

      this.io.sysexCommand([CP_COMMAND, CP_PIXEL_SET, this.pin, b1, b2, b3, b4]);
      this.io.sysexCommand([CP_COMMAND, CP_PIXEL_SHOW]);
    }
  }
};


module.exports = Playground;
