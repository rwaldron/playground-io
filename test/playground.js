var assert = require("assert");
var Emitter = require("events").EventEmitter;
var sinon = require("sinon");
var Firmata = require("firmata");
var Playground = require("../");

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
      // CP_PIXEL_SET
      assert.deepEqual(sysexCommand.firstCall.args[0], [ 64, 16, 1, 0, 0, 0, 0 ]);
      // CP_PIXEL_SHOW
      assert.deepEqual(sysexCommand.lastCall.args[0], [ 64, 17 ]);
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
      // CP_TONE
      assert.deepEqual(sysexCommand.firstCall.args[0], [ 64, 32, 0, 0, 0, 0 ]);
      done();
    });

    it("Calls to noTone make 1 sysexCommand call", (done) => {
      p.pin = 1;
      p.noTone();

      assert.equal(sysexCommand.callCount, 1);
      // CP_NO_TONE
      assert.deepEqual(sysexCommand.firstCall.args[0], [ 64, 33 ]);
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

});
