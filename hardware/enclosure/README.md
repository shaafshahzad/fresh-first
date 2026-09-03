# Fresh First 4.2-inch e-paper enclosure

This is a two-piece, parameterized OpenSCAD case for the Waveshare 4.2-inch
400 × 300 e-paper module. It provides:

- a rear-loading pocket for the 103 × 78.5 mm display PCB;
- a flush removable rear cover;
- four protected pockets for 20 × 3 mm disc magnets;
- a front-facing 32.5 × 32.5 mm pocket for a 30 × 30 mm NFC tag;
- an internal cavity for a small ESP32 board and wiring; and
- a generous right-side USB/cable service opening.

The assembled shell is approximately **120 × 129.5 × 16.8 mm**. The display
window is 86.2 × 64.8 mm. All important fit values are grouped at the top of
`fresh-first-case.scad` so they can be adjusted after the physical parts arrive.

The model targets the exact module in the prototype order:

- [Waveshare 4.2-inch e-paper module on Amazon Canada](https://www.amazon.ca/dp/B074NR1SW2)
- [Waveshare module specification](https://www.waveshare.com/product/ai/displays/e-paper/4.2inch-e-paper-module.htm)

## Files

- `fresh-first-case.scad` — editable source and exploded assembly preview
- `output/fresh-first-front.stl` — front shell
- `output/fresh-first-back.stl` — magnetized rear cover
- `output/fresh-first-magnet-test.stl` — quick pocket-clearance test
- `output/fresh-first-case-preview.png` — rendered exploded interior preview
- `output/fresh-first-product-preview.png` — rendered product-front preview

## Hardware

- Waveshare 4.2-inch E-Paper Module, 103 × 78.5 mm PCB
- 4 × 20 × 3 mm neodymium disc magnets ([8-pack used for this design](https://www.amazon.ca/dp/B09XJ5JFFX))
- 1 × ferrite-backed/on-metal NFC tag, no larger than 30 × 30 × 1 mm
- 4 × M2.5 × 8 mm countersunk self-tapping screws
- thin EVA/foam dots for the four PCB corners
- two-part epoxy or E6000-style flexible adhesive for the magnets

The current magnet pocket is **20.4 mm diameter × 3.2 mm deep**, with a 0.65 mm
printed skin between each magnet and the refrigerator. Print the fit-test part
first: magnet batches and printer calibration can vary. Increase
`magnet_d_clearance` in 0.1 mm steps if needed.

The linked magnet listing must have the **20x3mm 8Pcs-Silver** size selected.
Amazon may switch the selected variation when opening a product link, so verify
that exact size before ordering. Eight magnets provide four for the enclosure
and four spares for fit testing or a second revision.

Use an **on-metal or ferrite-backed NFC tag**. A plain sticker tag may become
unreliable when mounted near a steel refrigerator and four strong magnets. The
tag pocket is on the front lower chin to maximize separation from both.

## Export

From this directory:

```sh
openscad -o output/fresh-first-front.stl \
  -D 'part="front"' fresh-first-case.scad

openscad -o output/fresh-first-back.stl \
  -D 'part="back"' fresh-first-case.scad

openscad -o output/fresh-first-magnet-test.stl \
  -D 'part="magnet_test"' fresh-first-case.scad

openscad -o output/fresh-first-product-preview.png \
  --imgsize=1200,1200 --viewall --autocenter --projection=o \
  -D 'part="product_preview"' fresh-first-case.scad
```

## Print settings

- PETG recommended; PLA is fine for the first dimensional prototype.
- 0.20 mm layer height, 0.4 mm nozzle.
- 4 perimeters, 5 top/bottom layers, 20–30% gyroid infill.
- Print the front shell face-down and the rear cover fridge-side-down.
- No supports should be needed. Bridge the right-side service opening.

## Assembly

1. Print `fresh-first-magnet-test.stl` and confirm the magnet pocket before the
   full rear cover.
2. Dry-fit the display from the rear. Do not force the glass or flex cable.
3. Bond the NFC tag inside the lower front pocket, with its readable face aimed
   through the 0.8 mm front skin.
4. Mount the ESP32 and any battery with thin VHB/foam tape after confirming the
   exact purchased board and battery dimensions.
5. Put a thin foam dot on each PCB corner so the closed rear cover holds the
   module gently without flexing it.
6. Epoxy one magnet into each rear-cover pocket. Let the adhesive cure fully.
7. Close the case with four M2.5 × 8 mm countersunk self-tapping screws. Their
   heads must sit below the rear surface so they cannot scratch the fridge.

Do not print around installed magnets. Install them only after printing, and
keep loose neodymium magnets away from children, pets, magnetic cards, and
medical implants. They are brittle and can chip or pinch when allowed to snap
together.

## Fit notes before a production enclosure

This first version uses the manufacturer's PCB dimensions and allows extra
clearance for prototype wiring. Before a production print, measure the delivered
module's screen offset, rear component height, connector location, ESP32 board,
battery, screw heads, NFC tag, and magnets with calipers, then update the grouped
parameters at the top of the SCAD file.
