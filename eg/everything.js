var Playground = require("../");
var five = require("johnny-five");
var board = new five.Board({
  io: new Playground({
    port: "/dev/tty.usbmodem1411"
  })
});
board.on("ready", function() {

  /**
   * Playground Controllers
   */
  var accelerometer = new five.Accelerometer({
    controller: Playground.Accelerometer
  });

  var pixels = new five.Led.RGBs({
    controller: Playground.Pixel,
    pins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  });

  var pads = new five.Touchpad({
    controller: Playground.Touchpad,
    pads: [0, 10],
  });

  var piezo = new five.Piezo({
    controller: Playground.Piezo,
    pin: 5,
  });

  var thermometer = new five.Thermometer({
    controller: Playground.Thermometer,
    freq: 100
  });

  /**
   * Default Component Controllers
   * @type {five}
   */
  var buttons = new five.Buttons([4, 19]);

  var led = new five.Led(13);

  var light = new five.Sensor({
    pin: "A5",
    freq: 100
  });

  var sound = new five.Sensor({
    pin: "A4",
    freq: 100
  });

  var toggle = new five.Switch(21);

  /**
   * Events and Data Handling
   */
  accelerometer.on("tap", (data) => {
    piezo.frequency(data.double ? 1500 : 500, 50);
  });

  board.loop(1000, () => {
    console.log("Raw Light: %d", light.value);
    console.log("Raw Sound: %d", sound.value);
  });

  buttons.on("press", (button) => {
    console.log("Which button was pressed? ", button.pin);
    if (button.pin === 4) {
      led.on();
    }
    if (button.pin === 19) {
      led.off();
    }
  });

  thermometer.on("change", (data) => {
    console.log("Celcius: %d", data.C);
  });

  pads.on("change", (data) => {
    if (data.type === "down") {
      piezo.frequency(700, 50);
    } else {
      piezo.noTone();
    }
  });

  var index = 0;
  var colors = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "indigo",
    "violet",
  ];

  setInterval(() => {
    pixels.forEach(pixel => pixel.color(colors[index]));
    if (++index === colors.length) {
      index = 0;
    }
  }, 100);
});
