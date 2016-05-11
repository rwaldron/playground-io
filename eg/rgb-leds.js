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
