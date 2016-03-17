var Board = require("firmata");
var bufferpack = require("bufferpack");

// Constants that define the Circuit Playground Firmata command values.
var CP_COMMAND = 0x40;
var CP_PIXEL_SET = 0x10;
var CP_PIXEL_SHOW = 0x11;
var CP_PIXEL_CLEAR = 0x12;
var CP_TONE = 0x20;
var CP_NO_TONE = 0x21;
var CP_ACCEL_READ = 0x30;
var CP_ACCEL_TAP = 0x31;
var CP_ACCEL_ON = 0x32;
var CP_ACCEL_OFF = 0x33;
var CP_ACCEL_TAP_ON = 0x34;
var CP_ACCEL_TAP_OFF = 0x35;
var CP_ACCEL_READ_REPLY = 0x36;
var CP_ACCEL_TAP_REPLY = 0x37;
var CP_ACCEL_TAP_STREAM_ON = 0x38;
var CP_ACCEL_TAP_STREAM_OFF = 0x39;
var CP_ACCEL_STREAM_ON = 0x3A;
var CP_ACCEL_STREAM_OFF = 0x3B;
var CP_ACCEL_RANGE = 0x3C;
var CP_CAP_READ = 0x40;
var CP_CAP_ON = 0x41;
var CP_CAP_OFF = 0x42;
var CP_CAP_REPLY = 0x43;

// Accelerometer constants to be passed to set_accel_range.
var ACCEL_2G = 0;
var ACCEL_4G = 1;
var ACCEL_8G = 2;
var ACCEL_16G = 3;

// Constants for some of the board peripherals
var THERM_PIN = 0;  // Analog input connected to the thermistor.
var THERM_SERIES_OHMS = 10000.0;  // Resistor value in series with thermistor.
var THERM_NOMINAL_OHMS = 10000.0;  // Thermistor resistance at 25 degrees C.
var THERM_NOMIMAL_C = 25.0;  // Thermistor temperature at nominal resistance.
var THERM_BETA = 3950.0;  // Thermistor beta coefficient.
var CAP_THRESHOLD = 300;  // Threshold for considering a cap touch input pressed.
// If the cap touch value is above this value it is
// considered touched.

function Playground(options) {
  Board.call(this, options.port);
  this.on("ready", function () {
    this.sysexResponse(CP_COMMAND, function (data) {
      var command = data[0] & 0x7F;
      replyHandlers[command](data);
    });
  }.bind(this));
}

var replyHandlers = {};

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

Playground.parseFirmataByte = function (data) {
  // Parse a byte value from two 7-bit byte firmata response bytes.
  if (data.length != 2) {
    throw('Expected 2 bytes of firmata response for a byte value!');
  }
  return (data[0] & 0x7F) | ((data[1] & 0x01) << 7);
};

/**
 * Parse a 4 byte floating point value from a 7-bit byte firmata response
 * byte array.  Each pair of firmata 7-bit response bytes represents a single
 * byte of float data so there should be 8 firmata response bytes total.
 * @param {Array} data
 */
Playground.parseFirmataFloat = function(data) {
  return parseFirmata(data, '<f');
};

Playground.parseFirmataLong = function(data) {
  return parseFirmata(data, '<l');
};

function parseFirmata(data, format) {
  if (data.length != 8) {
    throw('Expected 8 bytes of firmata response for value to parse.');
  }
  //  Convert 2 7-bit bytes in little endian format to 1 8-bit byte for each
  //    of the four floating point bytes.
  var rawBytes = new ArrayBuffer(4);
  for (var i = 0; i < 4; i++) {
    rawBytes[i] = Playground.parseFirmataByte(data.slice(i * 2, i * 2 + 2));
  }
  return bufferpack.unpack(format, rawBytes)[0];
}

Playground.Gyro = {
  initialize: {
    value: function (opts, dataHandler) {
      replyHandlers[CP_ACCEL_READ_REPLY] = function (data) {
        if (data.length < 26) {
          console.log('Received accelerometer response with not enough data!')
          return
        }
        var x = Playground.parseFirmataFloat(data.slice(2, 10));
        var y = Playground.parseFirmataFloat(data.slice(10, 18));
        var z = Playground.parseFirmataFloat(data.slice(18, 26));
        var gyroDataObject = {x: x, y: y, z: z};
        dataHandler(gyroDataObject);
      };
    }
  },
  toNormal: {
    // TODO: fill in, verify
    value: function (raw) {
      return raw;
    }
  },
  start: {
    value: function () {
      this.io.sysexCommand([CP_COMMAND, CP_ACCEL_STREAM_ON]);
    }
  },
  stop: {
    value: function () {
      this.io.sysexCommand([CP_COMMAND, CP_ACCEL_STREAM_OFF]);
    }
  },
  toDegreesPerSecond: {
    // TODO: fill in, verify
    value: function (raw) {
      // TODO: factor in sensitivity
      //var state = priv.get(this);
      return raw; /// state.sensitivity;
    }
  }
};

module.exports = Playground;
