var Playground = require("../");
var five = require("johnny-five");
var board = new five.Board({
  io: new Playground({
    port: "/dev/tty.usbmodem1411"
  })
});
board.on("ready", function() {

  var accel = new five.Accelerometer({
    controller: Playground.Accelerometer,
  });

  accel.on("tap", () => console.log("tap"));

  accel.on("change", () => {
    console.log("  x            : ", accel.x);
    console.log("  y            : ", accel.y);
    console.log("  z            : ", accel.z);
    console.log("--------------------------------------");
  });
});
