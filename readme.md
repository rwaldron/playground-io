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
  
  var tap = new Playground.Tap(io); 
  
  var touch = new Playground.CapTouch(io);

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

  setInterval(function() {
    pixels.forEach(function(pixel) {
      pixel.color(colors[index]);
    });

    if (++index === colors.length) {
      index = 0;
    }
  }, 100);
  
  tap.onTap(function(single, double) {
    piezo.frequency(double ? 1500 : 500, 50);
  });
  
  touch.onTouch(10, function(didTouch, value) {
    if (didTouch) {
      piezo.frequency(700, 50);
    }
  });
});
```


## License

See LICENSE file.
