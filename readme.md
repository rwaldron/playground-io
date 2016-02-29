# Playground-IO

A special Firmata.js wrapper for Adafruit Circuit Playground. This mostly exists to expose controllers that may take advantage of the Circuit Playground's Firmata extensions. 

## Setup

```js
npm install johnny-five playground-io
```

## Playground.Pixel

Control the Neopixels directly attached to the board. 

```js
var Playground = require("playground-io");
var five = require("johnny-five");
var board = new five.Board({
  io: new Playground({
    port: "/dev/tty.usbmodem1411"
  })
});
board.on("ready", function() {
  var pixels = Array.from({ length: 10 }, function(_, index) {
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
```


## License

See LICENSE file.
