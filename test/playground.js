var assert = require("assert");
var Emitter = require("events").EventEmitter;
var sinon = require("sinon");
var Firmata = require("firmata");
var Playground = require("../");

// Constants that define the Circuit Playground Firmata command values.
// Must be synced with library source.
// TODO: Automate?
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

describe("Playground", () => {
  var sandbox;
  var emitter;
  var sysexCommand;
  var sysexResponse;

  beforeEach((done) => {
    sandbox = sinon.sandbox.create();
    emitter = new Emitter();
    sysexCommand = sandbox.stub(Firmata.prototype, "sysexCommand");
    sysexResponse = sandbox.stub(Firmata.prototype, "sysexResponse");
    done();
  });
  afterEach(done => {
    sandbox.restore();
    done();
  });

  describe("constructor", () => {
    it("Emits ready", (done) => {

      var pg = new Playground({
        port: emitter
      });

      pg.on("ready", () => done());
      pg.emit("ready");
    });

    it("Registers CP_COMMAND as 0x40", (done) => {

      var pg = new Playground({
        port: emitter
      });

      pg.on("ready", () => {
        assert.equal(sysexResponse.callCount, 1);
        done();
      });
      pg.emit("ready");
    });
  });

  describe("prototype", () => {
    it("Subclass of Emitter", (done) => {
      assert.equal(new Playground({ port: emitter }) instanceof Emitter, true);
      done();
    });

    it("Subclass of Firmata", (done) => {
      assert.equal(new Playground({ port: emitter }) instanceof Firmata, true);
      done();
    });

    it("Constructor is Playground", (done) => {
      assert.equal((new Playground({ port: emitter })).constructor, Playground);
      done();
    });
  });

  describe("Playground.Pixel", () => {
    var o;
    var p;

    beforeEach((done) => {
      o = { io: Object.create(Firmata.prototype) };
      p = Object.defineProperties(o, Playground.Pixel);
      done();
    });

    it("Is a descriptor, with two function property definitions", (done) => {
      assert.equal(typeof p.initialize, "function");
      assert.equal(typeof p.write, "function");
      done();
    });

    it("Calls to write make 2 sysexCommand calls", (done) => {
      p.pin = 1;
      p.write([0xff, 0xff, 0xff]);

      assert.equal(sysexCommand.callCount, 2);
      assert.deepEqual(sysexCommand.firstCall.args[0], [ CP_COMMAND, CP_PIXEL_SET, 1, 0, 0, 0, 0 ]);
      assert.deepEqual(sysexCommand.lastCall.args[0], [ CP_COMMAND, CP_PIXEL_SHOW ]);
      done();
    });
  });

  describe("Playground.Piezo", () => {
    var o;
    var p;

    beforeEach((done) => {
      o = { io: Object.create(Firmata.prototype) };
      p = Object.defineProperties(o, Playground.Piezo);
      done();
    });

    it("Is a descriptor, with two function property definitions", (done) => {
      assert.equal(typeof p.frequency, "function");
      assert.equal(typeof p.noTone, "function");
      done();
    });

    it("Calls to frequency make 1 sysexCommand call", (done) => {
      p.pin = 1;
      p.frequency([0xff, 0xff, 0xff]);

      assert.equal(sysexCommand.callCount, 1);
      assert.deepEqual(sysexCommand.firstCall.args[0], [ CP_COMMAND, CP_TONE, 0, 0, 0, 0 ]);
      done();
    });

    it("Calls to noTone make 1 sysexCommand call", (done) => {
      p.pin = 1;
      p.noTone();

      assert.equal(sysexCommand.callCount, 1);
      assert.deepEqual(sysexCommand.firstCall.args[0], [ CP_COMMAND, CP_NO_TONE ]);
      done();
    });
  });

  describe("Playground.Accelerometer", () => {
    var o;
    var p;

    beforeEach((done) => {
      o = { io: Object.create(Firmata.prototype) };
      p = Object.defineProperties(o, Playground.Accelerometer);
      done();
    });

    // TODO: need example data to simulate sysexResponse handling
  });


  describe("Playground.Touchpad", () => {
    var o;
    var p;

    beforeEach((done) => {
      o = { io: Object.create(Firmata.prototype) };
      p = Object.defineProperties(o, Playground.Touchpad);
      done();
    });

  // Build a response data packet and send it.  The response includes:
  // - uint8_t: CP_CAP_REPLY value
  // - uint8_t: pin number of the read input
  // - int32_t: cap sensor value, large values mean the input was touched

    // TODO: need example data to simulate sysexResponse handling

    // [ CP_COMMAND, CP_CAP_REPLY, pin,  ]

  });

});
