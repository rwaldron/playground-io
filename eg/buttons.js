var Playground = require("../");
var five = require("johnny-five");
var board = new five.Board({
  io: new Playground({
    port: "/dev/tty.usbmodem1411"
  })
});
board.on("ready", function() {
  var buttons = new five.Buttons([4, 19]);

  buttons.on("press", (button) => {
    console.log("Which button was pressed? ", button.pin);
  });
});
