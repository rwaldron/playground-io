var Playground = require("../");
var five = require("johnny-five");
var board = new five.Board({
  io: new Playground({
    port: "/dev/tty.usbmodem1411"
  })
});
board.on("ready", function() {
  var pads = new five.Touchpad({
    controller: Playground.Touchpad,
    pads: [0, 1, 2, 3, 6, 9, 10, 12],
  });

  pads.on("touch", (event) => {
    console.log("Which pads are touched? ", event.which);
  });

  pads.on("hold", (event) => {
    console.log("Which pads are held? ", event.which);
  });
});
