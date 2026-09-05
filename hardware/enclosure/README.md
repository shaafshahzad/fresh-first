# Fresh First 4.2-inch e-paper enclosure

This is a two-piece, parameterized OpenSCAD case for the Waveshare 4.2-inch
400 x 300 e-paper module and the complete rechargeable prototype electronics.
The removable rear cover doubles as an organized electronics carrier.

The revised case provides:

- a rear-loading pocket for the 103 x 78.5 mm display PCB;
- a shallow circular front pocket for a 25 mm adhesive NFC sticker;
- four blind pockets for 20 x 3 mm disc magnets;
- locating features for the ESP32, LiPo, charger, boost regulator, and gauge;
- a right-side USB-C charging opening;
- wire-routing posts between the power boards and battery; and
- enough depth for 20 mm Dupont connector bodies plus a 4 mm bend allowance.

The assembled prototype envelope is approximately **120 x 129.5 x 38 mm**.
The visible display window is 86.2 x 64.8 mm. The increased depth is deliberate:
the female jumper ends plugged into the ESP32 are 15-20 mm long, and the case
must not press those connectors or force their wires through a sharp turn.

The display PCB retaining rails include a **-5 mm Y fit correction** measured
from the first physical print. This moves the module toward the lower NFC chin
without moving the exterior display opening. The correction is exposed as
`pcb_fit_shift_y` near the top of the SCAD source for later calibration.

## Files

- `fresh-first-case.scad` - editable source and fit envelopes
- `output/fresh-first-front.stl` - deep front shell
- `output/fresh-first-back.stl` - removable electronics-carrier cover
- `output/fresh-first-magnet-test.stl` - quick magnet-pocket fit test
- `output/fresh-first-nfc-test.stl` - quick 25 mm NFC-pocket fit test
- `output/fresh-first-case-preview.png` - exploded enclosure preview
- `output/fresh-first-carrier-preview.png` - electronics layout preview
- `output/fresh-first-product-preview.png` - product-front preview

## Intended prototype hardware

- [Waveshare 4.2-inch e-paper module](https://www.amazon.ca/dp/B074NR1SW2),
  103 x 78.5 mm PCB
- Generic 30-pin ESP32 DevKit, modeled at 29 x 52 mm
- [Protected Palogreen LiPo](https://www.amazon.ca/dp/B0CKGY7YJ5), modeled at
  50 x 34 x 10 mm
- [TP4056 USB-C charger/protection module](https://www.amazon.ca/dp/B0CD7H3XD7),
  modeled at 26 x 17 mm
- [MT3608 boost converter](https://www.amazon.ca/dp/B083DN28HW), modeled at
  36 x 17 x 14 mm including the adjustment component
- [MAX17043 battery gauge](https://www.amazon.ca/dp/B0C8RQPWX9), modeled at
  25 x 20 mm
- 4 x 20 x 3 mm neodymium disc magnets
  ([8-pack used for this design](https://www.amazon.ca/dp/B09XJ5JFFX))
- 1 x [Timeskey NTAG215 25 mm adhesive NFC sticker](https://www.amazon.ca/dp/B0CPJ5DDCQ)
- 4 x M2.5 x 8 mm countersunk self-tapping screws
- thin closed-cell foam and high-quality VHB tape

The board carriers include 0.9-1.2 mm plan-view clearance. Amazon module
dimensions can vary between sellers and revisions, so measure every delivered
board with calipers before relying on the carrier as a final production fit.
The carrier features are intentionally low: they locate parts but do not cover
connectors or clamp the battery pouch.

## Clearance model

The source treats the Dupont plug as a 20 mm body and reserves another 4 mm for
the wire to begin turning sideways. An OpenSCAD assertion prevents export if a
future depth change makes this stack collide with the display PCB keep-out.
The tallest current power board envelope is the 14 mm MT3608, so the ESP32
jumper stack remains the depth-driving component.

The battery cradle is a low perimeter guide only. Secure the pouch with a thin
foam-backed adhesive pad; never crush, bend, screw through, or tightly clamp a
LiPo cell. Leave its lead exit facing the charging and boost boards.

## Export

From `hardware/enclosure`:

```sh
openscad -o output/fresh-first-front.stl \
  -D 'part="front"' fresh-first-case.scad

openscad -o output/fresh-first-back.stl \
  -D 'part="back"' fresh-first-case.scad

openscad -o output/fresh-first-magnet-test.stl \
  -D 'part="magnet_test"' fresh-first-case.scad

openscad -o output/fresh-first-nfc-test.stl \
  -D 'part="nfc_test"' fresh-first-case.scad

openscad -o output/fresh-first-case-preview.png \
  --imgsize=1400,1400 --viewall --autocenter --projection=o \
  -D 'part="assembly"' fresh-first-case.scad

openscad -o output/fresh-first-carrier-preview.png \
  --imgsize=1400,1400 --viewall --autocenter --projection=o \
  -D 'part="carrier_preview"' fresh-first-case.scad

openscad -o output/fresh-first-product-preview.png \
  --imgsize=1200,1200 --viewall --autocenter --projection=o \
  -D 'part="product_preview"' fresh-first-case.scad
```

## Print settings

- PETG recommended; PLA is acceptable for the first fit prototype.
- 0.20 mm layer height with a 0.4 mm nozzle.
- 4 wall loops, 5 top and bottom layers, 25% gyroid infill.
- Print the front shell face-down.
- Print the rear carrier fridge-side-down, with all carrier features upward.
- No support should be required. A 5 mm brim is useful for the tall front shell
  if bed adhesion is uncertain.
- Do not print the committed STLs from an older Bambu Studio project without
  first removing and reimporting them; the geometry has changed substantially.

Print `fresh-first-magnet-test.stl` first. The pocket is **20.4 mm diameter x
3.35 mm usable depth**, leaving a 0.65 mm printed skin against the refrigerator.
Increase `magnet_d_clearance` in 0.1 mm steps if the delivered magnets do not
fit. Confirm the Amazon variation is **20x3mm 8Pcs-Silver** before ordering.

Print `fresh-first-nfc-test.stl` before reprinting the full front shell. Its
25.8 mm diameter x 0.6 mm deep recess exactly matches the production pocket and
includes the same removal notch. Test the sticker with its backing still on;
only peel and adhere it during final assembly.

## Electrical layout

The planned prototype power path is:

```text
Protected LiPo -> TP4056 OUT -> power switch -> MT3608 set to 5.0 V -> ESP32 VIN
ESP32 3V3 -> Waveshare VCC
MAX17043 -> LiPo terminals and ESP32 GPIO 21/22 over I2C
```

Adjust and verify the MT3608 output with a multimeter **before** connecting it
to the ESP32. Confirm LiPo polarity rather than trusting connector wire colors.
This TP4056 prototype does not provide proper power-path/load-sharing behavior;
charge with the device switched off. Never connect laptop USB power and the
battery-derived 5 V rail to the ESP32 at the same time unless the power circuit
has been specifically redesigned to prevent backfeeding.

## Assembly

1. Print and test the magnet coupon.
2. Dry-fit the empty front shell, display, and rear carrier before installing
   the battery or adhesives. The second revision shifts all four display
   retaining rails 5 mm toward the NFC chin based on the first printed fit.
3. Adhere the 25 mm NFC sticker inside the circular lower-front landing. The
   adhesive side faces the case front; press it flat without creasing the
   antenna. The small side notch allows later removal with tweezers.
4. Fit the ESP32 into its carrier. Confirm that every plugged Dupont connector
   can stand straight before its wire makes a gentle sideways bend.
5. Fit the charger with its USB-C connector facing the right-side opening, then
   fit the boost and gauge boards.
6. Secure the LiPo with a thin foam-backed adhesive pad inside its low cradle.
7. Route loose conductors through the paired guide posts and keep them away from
   the cover-screw paths.
8. Add thin foam dots at the display PCB corners so the closed cover retains it
   gently without flexing the panel.
9. Bond one magnet into each blind pocket and let the adhesive cure completely.
10. Close the case with four M2.5 x 8 mm countersunk self-tapping screws. Screw
    heads must remain below the rear surface so they cannot scratch the fridge.

Remove the rear carrier before using the ESP32 USB-C port for firmware work, and
disconnect the battery-derived output first. Do not print around installed
magnets. Keep loose neodymium magnets away from children, pets, magnetic cards,
and medical implants; they are brittle and can chip or pinch.

## Before calling this production-ready

This is a fit-tolerant prototype derived from manufacturer and listing
dimensions. Measure the delivered battery and each circuit board, including
their solder joints, USB connector overhang, wire-exit direction, and tallest
component. Then update the grouped parameters near the top of
`fresh-first-case.scad`. A production revision should also use a proper
load-sharing power-path circuit, a keyed battery connector, strain relief, and
a vented/flame-retardant material strategy reviewed for the chosen LiPo.
