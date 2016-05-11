var Playground = require("../");
var five = require("johnny-five");
var board = new five.Board({
  io: new Playground({
    port: "/dev/tty.usbmodem1411"
  })
});
board.on("ready", function() {
  var pixels = Array.from({ length: 10 }, (_, index) => {
    return new five.Led.RGB({
      controller: Playground.Pixel,
      pin: index
    });
  });

  var led = new five.Led(13);
  var buttonL = new five.Button(4);
  var buttonR = new five.Button(19);
  var toggle = new five.Switch(21);

  var piezo = new five.Piezo({
    controller: Playground.Piezo,
    pin: 5,
  });

  var thermometer = new five.Thermometer({
    controller: "TINKERKIT",
    pin: "A0",
    freq: 100
  });

  var light = new five.Sensor({
    pin: "A5",
    freq: 100
  });

  var sound = new five.Sensor({
    pin: "A4",
    freq: 100
  });

  var accelerometer = new five.Accelerometer({
    controller: Playground.Accelerometer
  });

  accelerometer.on("tap", (data) => {
    piezo.frequency(data.double ? 1500 : 500, 50);
  });

  var pads = new five.Touchpad({
    controller: Playground.Touchpad,
    pads: [10],
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
