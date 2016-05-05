var Firmata = require("firmata");
var Emitter = require("events").EventEmitter; // A trick for Browserify/Webpack
var Buffer = require("buffer/").Buffer; // A trick for Browserify/Webpack
var priv = new Map();

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
// If the cap touch value is above this value it is considered touched.

function Playground(options) {
  Firmata.call(this, options.port);

  // Used to provide private state to this instance
  var state = {
    handlers: {},
  };

  priv.set(this, state);

  this.on("ready", function() {
    this.sysexResponse(CP_COMMAND, function(data) {
      var bytes = Firmata.decode(data);
      var command = bytes.shift();
      var handler = state.handlers[command];

      if (typeof handler === "function") {
        handler(bytes);
      }
    });
  }.bind(this));
}

Playground.prototype = Object.create(Firmata.prototype, {
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

Playground.Accelerometer = {
  initialize: {
    value: function(opts, dataHandler) {
      var playground = priv.get(this.board);

      playground.handlers[CP_ACCEL_READ_REPLY] = function(data) {
        var buffer = new Buffer(data);

        dataHandler({
          x: buffer.readFloatLE(0),
          y: buffer.readFloatLE(4),
          z: buffer.readFloatLE(8),
        });
      };

      playground.handlers[CP_ACCEL_TAP_REPLY] = function(data) {
        // data only contains a single 8-bit byte
        var value = data[0];
        var hasAnyTap = (value & 0x30) > 0;

        if (hasAnyTap) {
          this.emit("tap");
        }

        if (hasAnyTap && (value & 0x10) > 0) {
          this.emit("tap:single");
        }

        if (hasAnyTap && (value & 0x20) > 0) {
          this.emit("tap:double");
        }
      }.bind(this);

      this.on("newListener", function(event, handler) {
        if (event === "data" || event === "change") {
          this.io.sysexCommand([CP_COMMAND, CP_ACCEL_STREAM_ON]);
        }
        if (event.startsWith("tap")) {
          this.io.sysexCommand([CP_COMMAND, CP_ACCEL_TAP_STREAM_ON]);
        }
      }.bind(this));
    },
  },
  toGravity: {
    value: function(raw) {
      return raw;
    },
  },
  stop: {
    value: function() {
      Object.keys(this._events).forEach(function(event) {
        this.removeAllListeners(event);
      }, this);
      this.io.sysexCommand([CP_COMMAND, CP_ACCEL_STREAM_OFF]);
    },
  },
};

var aliases = {
  down: ["down", "press", "tap", "impact", "hit"],
  up: ["up", "release"],
  hold: ["hold"]
};

function touches(length) {
  return Array.from({
    length: length
  }, function() {
    return {
      timeout: null,
      value: 0,
    };
  });
}

Playground.Touch = {
  initialize: {
    value: function(opts, dataHandler) {
      var playground = priv.get(this.board);
      var length = opts.keys.length;

      playground.touch = {
        touches: touches(length),
        timeout: null,
        length: length,
        keys: opts.keys,
        holdtime: opts.holdtime || 500,
      };

      opts.keys.forEach(function(key) {
        this.io.sysexCommand([CP_COMMAND, CP_CAP_ON, key & 0x7F]);
      }, this);

      playground.handlers[CP_CAP_REPLY] = function(data) {
        var pin = data[0];
        var value = data[1];

        var now = Date.now();
        var indices = this.toIndices(pin);
        var kLength = state.length;

        var lists = {
          down: [],
          hold: [],
          up: [],
        };

        var target = null;
        var alias = null;

        for (var k = 0; k < kLength; k++) {
          alias = this.toAlias(k);

          if (indices.indexOf(k) !== -1) {
            if (state.touches[k].value === 0) {

              state.touches[k].timeout = now + state.holdtime;
              lists.down.push(alias);

            } else if (state.touches[k].value === 1) {
              if (state.touches[k].timeout !== null && now > state.touches[k].timeout) {
                state.touches[k].timeout = now + state.holdtime;
                lists.hold.push(alias);
              }
            }

            state.touches[k].value = 1;
          } else {
            if (state.touches[k].value === 1) {
              state.touches[k].timeout = null;
              lists.up.push(alias);
            }
            state.touches[k].value = 0;
          }
          target = null;
          alias = null;
        }

        Object.keys(lists).forEach(function(key) {
          var list = lists[key];

          if (list.length) {
            trigger.call(this, key, list);
          }
        }, this);
    }.bind(this);
    },
  },
  toAlias: {
    value: function(index) {
      return index;
    }
  },
  toIndices: {
    value: function(raw) {
      var playground = priv.get(this.board);
      var length = playground.touch.length;
      var indices = [];
      for (var i = 0; i < length; i++) {
        if (raw === playground.touch.keys[i]) {
          indices.push(i);
        }
      }
      return indices;
    }
  }
};

module.exports = Playground;
