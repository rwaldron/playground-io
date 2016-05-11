var Firmata = require("firmata");
var debounce = require("lodash.debounce");
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
      var playground = priv.get(this.io);

      playground.handlers[CP_ACCEL_READ_REPLY] = (data) => {
        var buffer = new Buffer(data);

        dataHandler({
          x: buffer.readFloatLE(0),
          y: buffer.readFloatLE(4),
          z: buffer.readFloatLE(8),
        });
      };

      playground.handlers[CP_ACCEL_TAP_REPLY] = (data) => {
        // data only contains a single 8-bit byte
        var value = data[0];
        var hasAnyTap = (value & 0x30) > 0;
        var tapTypes = {};

        if (hasAnyTap && (value & 0x10) > 0) {
          tapTypes.single = true;
          this.emit("tap:single");
        }

        if (hasAnyTap && (value & 0x20) > 0) {
          tapTypes.double = true;
          this.emit("tap:double");
        }

        if (hasAnyTap) {
          this.emit("tap", tapTypes);
        }
      };

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
      Object.keys(this._events).forEach((event) => {
        this.removeAllListeners(event);
      });
      this.io.sysexCommand([CP_COMMAND, CP_ACCEL_STREAM_OFF]);
    },
  },
};

// This sucks, but is only temporary until Johnny-Five
// Keypad/Touchpad can be refactored to support 3rd party controllers
var aliases = {
  down: ["down", "press", "tap", "impact", "hit", "touch"],
  up: ["up", "release"],
  hold: ["hold"]
};

function touches(length) {
  return Array.from({ length }, function() {
    return {
      timeout: null,
      value: 0,
    };
  });
}

Playground.Touchpad = {
  initialize: {
    value: function(opts, dataHandler) {
      var playground = priv.get(this.io);
      var pads = [0, 1, 2, 3, 6, 9, 10, 12];
      var trigger = debounce((type, value) => {
        var event = {
          type: type,
          which: value,
          timestamp: Date.now()
        };
        aliases[type].forEach(type => {
          if (this.listenerCount(type)) {
            this.emit(type, event);
          }
        });
        this.emit("change", event);
      }, 5);

      var state = {
        touches: touches(8),
        timeout: null,
        pads: pads,
        holdtime: opts.holdtime || 500,
      };

      priv.set(this, state);

      opts.pads.forEach(pad => {
        this.io.sysexCommand([CP_COMMAND, CP_CAP_ON, pad & 0x7F]);
      });

      var bits = 0b00000000;
      var padsToBit = pads.reduce((accum, pad, index) => (accum[pad] = index, accum), {});

      // Notes:
      //
      // This normally would _not_ be so complex, but I overlooked
      // the sharing of private state with 3rd party controllers
      // when I was designing the Keypad/Touchpad class. For now, we'll
      // have to accept this implementation, but I will prioritize
      // the private state issue. - RW
      //

      playground.handlers[CP_CAP_REPLY] = (data) => {
        var pad = data[0];
        var bit = padsToBit[pad];
        var buffer = new Buffer(data);
        // 5 bytes are received, read the last 4
        var value = buffer.readInt16LE(1);

        // This allows us to support "multitouch"
        if (value >= CAP_THRESHOLD) {
          bits |= 1 << bit;
        } else {
          bits &= ~(1 << bit);
        }

        handler(bits);
      };

      var handler = (touched) => {
        var now = Date.now();
        var indices = this.toIndices(touched);
        var lists = {
          down: [],
          hold: [],
          up: [],
        };

        var target = null;
        var alias = null;

        if (!handler.count) {
          handler.count = 0;
        }

        handler.count++;

        for (var k = 0; k < 8; k++) {
          alias = this.toAlias(k);

          if (opts.pads.indexOf(alias) === -1) {
            continue;
          }

          if (indices.indexOf(k) >= 0) {
            if (state.touches[k].value === 0) {
              indices.forEach(index => (state.touches[index].timeout = now + state.holdtime));
              lists.down.push(alias);
            } else if (state.touches[k].value === 1) {
              if (state.touches[k].timeout !== null && now >= state.touches[k].timeout) {
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

        Object.keys(lists).forEach((key) => {
          if (lists[key].length) {
            trigger(key, lists[key]);
          }
        });
      };
    },
  },
  toAlias: {
    value: function(index) {
      var state = priv.get(this);
      return state.pads[index];
    }
  },
  toIndices: {
    value: function(raw) {
      var state = priv.get(this);
      var indices = [];

      for (var i = 0; i < 8; i++) {
        if (raw & (1 << i)) {
          indices.push(i);
        }
      }
      return indices;
    }
  }
};

Playground.Thermometer = {
  initialize: {
    value: function(opts, dataHandler) {
      this.io.pinMode(0, this.io.MODES.ANALOG);
      this.io.analogRead(0, dataHandler);
    }
  },
  toCelsius: {
    value: function(raw) {
      // Ported DIRECTLY from circuitplayground.py
      // Author: Tony DiCola
      // The MIT License (MIT)
      // https://github.com/adafruit/CircuitPlaygroundFirmata/blob/master/Python%20Examples/circuitplayground.py#L1-L28
      var THERM_SERIES_OHMS  = 10000;  // Resistor value in series with thermistor.
      var THERM_NOMINAL_OHMS = 10000;  // Thermistor resistance at 25 degrees C.
      var THERM_NOMIMAL_C    = 25;     // Thermistor temperature at nominal resistance.
      var THERM_BETA         = 3950;   // Thermistor beta coefficient.

      var resistance = (1023 * THERM_SERIES_OHMS) / raw;
      resistance -= THERM_SERIES_OHMS;

      // Take directly circuitplayground.py
      // Now apply Steinhart-Hart equation.
      var steinhart = resistance / THERM_NOMINAL_OHMS;
      steinhart = Math.log(steinhart);
      steinhart /= THERM_BETA;
      steinhart += 1 / (THERM_NOMIMAL_C + 273.15);
      steinhart = 1 / steinhart;
      steinhart -= 273.15;
      return Math.round(steinhart);
    }
  }
};

module.exports = Playground;
