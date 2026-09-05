# Fresh First display firmware

This PlatformIO project contains the first hardware test for the 30-pin ESP32
DevKit and Waveshare 4.2-inch black/white V2 e-paper module.

## Wiring

Disconnect USB power before adding or moving wires.

| Display | ESP32 |
| --- | --- |
| VCC | 3V3 |
| GND | GND |
| DIN | D14 / GPIO14 |
| CLK | D13 / GPIO13 |
| CS | D15 / GPIO15 |
| DC | D27 / GPIO27 |
| RST | D26 / GPIO26 |
| BUSY | D25 / GPIO25 |

Leave the display module's `BS` resistor in its factory four-wire SPI position.

## Build and upload

Install PlatformIO once with a pip-capable tool environment:

```sh
uv tool install platformio --with pip
```

Then, from this directory:

```sh
platformio run
platformio run \
  --target upload \
  --upload-port /dev/cu.usbserial-0001
```

The display should clear and show a bordered **FRESH FIRST** hardware-test
screen. A successful upload also logs status at 115200 baud. E-paper retains
the last image without power, so the firmware hibernates the panel immediately
after drawing.

If upload waits at `Connecting...`, hold the ESP32 `BOOT` button, briefly press
and release `EN`, and release `BOOT` once writing begins.
