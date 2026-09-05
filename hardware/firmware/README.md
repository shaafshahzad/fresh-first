# Fresh First display firmware

This PlatformIO project powers the 30-pin ESP32 DevKit and Waveshare 4.2-inch
black/white V2 e-paper prototype. It provisions Wi-Fi through a phone-friendly
captive portal, securely fetches the paired fridge feed, refreshes the panel
only when its content changes, and sleeps between checks.

The monochrome Waveshare V2 panel used by this prototype has an SSD1683
controller and requires the `GxEPD2_420_GDEY042T81` driver. The older
UC8176-compatible `GxEPD2_420` driver can compile and transmit without errors,
but the V2 panel ignores those frames and retains its previous image.

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

For a real unit, first generate a unique device record and local credentials
header from the repository root:

```sh
bun run device:provision -- \
  --firmware-header hardware/firmware/include/device_secrets.h \
  --app-url https://fresh-first.vercel.app \
  "Kitchen display prototype"
```

The generated `device_secrets.h` is ignored by Git and created with owner-only
permissions. Never commit or paste its device secret. Rebuild and upload after
provisioning.

On first boot, the display shows a temporary Wi-Fi network named **Fresh First
XXXX**. Join it from a phone and choose the home 2.4 GHz network in the captive
portal. Once online, the display shows a pairing code. Tap the NFC tag or open
the account page, sign in, and enter that code. The display checks pairing mode
every 30 seconds and switches to the live fridge list automatically.

Normal fridge mode checks every 15 minutes and uses the feed's `ETag` to skip
unchanged e-paper refreshes. E-paper retains its image without power, and the
firmware hibernates the panel and deep-sleeps the ESP32 between checks.

If upload waits at `Connecting...`, hold the ESP32 `BOOT` button, briefly press
and release `EN`, and release `BOOT` once writing begins.

If the saved Wi-Fi is unavailable, the setup portal reopens automatically.
This prototype uses the ESP32 DevKit's onboard regulator and power LED, so its
measured battery life will be worse than a production low-power board even
while the ESP32 itself is in deep sleep.
