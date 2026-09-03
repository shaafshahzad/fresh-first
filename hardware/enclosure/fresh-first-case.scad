/*
 * Fresh First 4.2-inch e-paper enclosure
 *
 * Designed for the Waveshare 4.2inch E-Paper Module (103 x 78.5 mm PCB),
 * four 20 x 3 mm disc magnets, and a 30 x 30 mm on-metal NFC tag.
 *
 * Export examples:
 *   openscad -o output/fresh-first-front.stl -D 'part="front"' fresh-first-case.scad
 *   openscad -o output/fresh-first-back.stl -D 'part="back"' fresh-first-case.scad
 *   openscad -o output/fresh-first-magnet-test.stl -D 'part="magnet_test"' fresh-first-case.scad
 */

$fn = 72;

// Select: "front", "back", "assembly", "product_preview", "magnet_test"
part = "assembly";

// Purchased display module
pcb_w = 103.0;
pcb_h = 78.5;
pcb_t = 1.6;
pcb_clearance = 0.55;

// Visible e-paper area. These offsets are adjustable after a physical dry fit.
window_w = 86.2;
window_h = 64.8;
window_bottom_offset = 8.0;
window_corner_r = 1.4;

// Case envelope
side_margin = 8.5;
top_margin = 8.5;
nfc_chin = 34.0;
case_w = pcb_w + (2 * side_margin);       // 120.0 mm
case_h = pcb_h + (2 * top_margin) + nfc_chin; // 129.5 mm
case_r = 12.0;
shell_depth = 16.8;
face_t = 2.2;
wall = 2.4;

// Inset rear cover
cover_t = 3.85;
cover_rebate = 1.2;
cover_clearance = 0.25;
cover_inset = cover_rebate + cover_clearance;

// Magnets: 20 x 3 mm discs, installed from the inside of the rear cover.
magnet_d = 20.0;
magnet_t = 3.0;
magnet_d_clearance = 0.40;
magnet_t_clearance = 0.20;
magnet_rear_skin = 0.65;
magnet_edge_offset = 14.5;

// NFC: accepts a 30 x 30 mm ferrite-backed/on-metal tag.
nfc_tag_w = 30.0;
nfc_tag_h = 30.0;
nfc_tag_t = 1.0;
nfc_xy_clearance = 2.5;
nfc_depth_clearance = 0.40;
nfc_front_skin = face_t - nfc_tag_t - nfc_depth_clearance;
nfc_pocket_w = nfc_tag_w + nfc_xy_clearance;
nfc_pocket_h = nfc_tag_h + nfc_xy_clearance;
nfc_pocket_r = 2.0;
nfc_pocket_x = (case_w - nfc_pocket_w) / 2;
nfc_pocket_y = 6.0;

// Module placement inside the front shell
pcb_x = (case_w - pcb_w) / 2;
pcb_y = top_margin + nfc_chin;
window_x = pcb_x + ((pcb_w - window_w) / 2);
window_y = pcb_y + window_bottom_offset;

// Four M2.5 self-tapping rear-cover screws, kept away from the magnets.
screw_d = 2.8;
screw_head_d = 5.4;
screw_head_h = 1.5;
pilot_d = 2.05;
boss_d = 6.0;
screw_x_left = 5.25;
screw_x_right = case_w - 5.25;
screw_y_low = 48.0;
screw_y_high = 96.0;
screw_points = [
    [screw_x_left, screw_y_low],
    [screw_x_left, screw_y_high],
    [screw_x_right, screw_y_low],
    [screw_x_right, screw_y_high]
];

// Generous cable/USB access slot on the right edge.
service_slot_y = pcb_y + 18.0;
service_slot_length = 15.0;
service_slot_height = 7.0;
service_slot_z = 7.0;

eps = 0.02;

module rounded_rect_2d(w, h, r) {
    hull() {
        translate([r, r]) circle(r = r);
        translate([w - r, r]) circle(r = r);
        translate([r, h - r]) circle(r = r);
        translate([w - r, h - r]) circle(r = r);
    }
}

module rounded_prism(w, h, d, r) {
    linear_extrude(height = d)
        rounded_rect_2d(w, h, r);
}

module screw_bosses() {
    for (point = screw_points) {
        difference() {
            translate([point[0], point[1], face_t])
                cylinder(d = boss_d, h = shell_depth - cover_t - face_t + 0.25);
            translate([point[0], point[1], shell_depth - cover_t - 7.0])
                cylinder(d = pilot_d, h = 7.3);
        }
    }
}

module pcb_locators() {
    locator_t = 0.9;
    locator_h = 3.1;
    inside_left = pcb_x - (pcb_clearance / 2);
    inside_right = pcb_x + pcb_w + (pcb_clearance / 2);
    inside_bottom = pcb_y - (pcb_clearance / 2);
    inside_top = pcb_y + pcb_h + (pcb_clearance / 2);

    // Short rails avoid the connector and let the board lift out during fitting.
    translate([inside_left - locator_t, pcb_y + 12, face_t])
        cube([locator_t, pcb_h - 24, locator_h]);
    translate([inside_right, pcb_y + 12, face_t])
        cube([locator_t, pcb_h - 24, locator_h]);
    translate([pcb_x + 15, inside_bottom - locator_t, face_t])
        cube([pcb_w - 30, locator_t, locator_h]);
    translate([pcb_x + 15, inside_top, face_t])
        cube([pcb_w - 30, locator_t, locator_h]);
}

module front_shell_skin() {
    difference() {
        rounded_prism(case_w, case_h, shell_depth, case_r);

        // Main electronics cavity, leaving the front face and perimeter walls.
        translate([wall, wall, face_t])
            rounded_prism(
                case_w - (2 * wall),
                case_h - (2 * wall),
                shell_depth - face_t + eps,
                max(case_r - wall, 1)
            );

        // Rebate makes the rear cover flush with the outer shell.
        translate([cover_rebate, cover_rebate, shell_depth - cover_t])
            rounded_prism(
                case_w - (2 * cover_rebate),
                case_h - (2 * cover_rebate),
                cover_t + eps,
                case_r - cover_rebate
            );

        // Display opening.
        translate([window_x, window_y, -eps])
            rounded_prism(window_w, window_h, face_t + (2 * eps), window_corner_r);

        // NFC pocket opens inside, leaving a thin plastic read-through face.
        translate([nfc_pocket_x, nfc_pocket_y, nfc_front_skin])
            rounded_prism(
                nfc_pocket_w,
                nfc_pocket_h,
                face_t - nfc_front_skin + eps,
                nfc_pocket_r
            );

        // Oversized side opening tolerates common USB-C ESP32 board variants.
        translate([
            case_w - wall - eps,
            service_slot_y,
            service_slot_z
        ])
            cube([wall + (2 * eps), service_slot_length, service_slot_height]);

        // Minimal recessed NFC cue on the lower front face.
        translate([case_w / 2, 22.0, -eps])
            linear_extrude(height = 0.38)
                text(
                    "TAP TO ADD",
                    size = 4.2,
                    halign = "center",
                    valign = "center",
                    font = "Arial:style=Bold",
                    spacing = 1.08
                );
    }
}

module front_shell() {
    union() {
        front_shell_skin();
        pcb_locators();
        screw_bosses();
    }
}

module magnet_positions() {
    for (x = [magnet_edge_offset, case_w - magnet_edge_offset])
        for (y = [magnet_edge_offset, case_h - magnet_edge_offset])
            translate([x, y, 0]) children();
}

module back_cover() {
    cover_w = case_w - (2 * cover_inset);
    cover_h = case_h - (2 * cover_inset);
    cover_r = case_r - cover_inset;

    difference() {
        translate([cover_inset, cover_inset, 0])
            rounded_prism(cover_w, cover_h, cover_t, cover_r);

        // Blind magnet pockets leave a 0.65 mm plastic skin against the fridge.
        magnet_positions()
            translate([0, 0, magnet_rear_skin])
                cylinder(
                    d = magnet_d + magnet_d_clearance,
                    h = cover_t - magnet_rear_skin + eps
                );

        // Through-holes plus recessed countersinks keep screw heads off the fridge.
        for (point = screw_points) {
            translate([point[0], point[1], -eps])
                cylinder(d = screw_d, h = cover_t + (2 * eps));
            translate([point[0], point[1], -eps])
                cylinder(
                    d1 = screw_head_d,
                    d2 = screw_d,
                    h = screw_head_h + eps
                );
        }
    }
}

module magnet_fit_test() {
    test_w = magnet_d + 8;
    difference() {
        rounded_prism(test_w, test_w, cover_t, 3);
        translate([test_w / 2, test_w / 2, magnet_rear_skin])
            cylinder(
                d = magnet_d + magnet_d_clearance,
                h = cover_t - magnet_rear_skin + eps
            );
    }
}

module assembly_preview() {
    // Front shell
    color([0.90, 0.88, 0.80, 0.72]) front_shell();

    // PCB and active display placeholders
    color([0.08, 0.25, 0.20, 0.72])
        translate([pcb_x, pcb_y, face_t + 0.15])
            cube([pcb_w, pcb_h, pcb_t]);
    color([0.96, 0.95, 0.89, 1.0])
        translate([window_x, window_y, 0.10])
            cube([window_w, window_h, 0.20]);

    // NFC tag placeholder
    color([0.13, 0.55, 0.40, 0.85])
        translate([
            (case_w - nfc_tag_w) / 2,
            nfc_pocket_y + ((nfc_pocket_h - nfc_tag_h) / 2),
            nfc_front_skin
        ])
            cube([nfc_tag_w, nfc_tag_h, nfc_tag_t]);

    // Rear cover and magnets, lifted and oriented as they sit in the shell.
    preview_gap = 10;
    translate([0, 0, shell_depth + preview_gap + cover_t])
        mirror([0, 0, 1]) {
            color([0.20, 0.20, 0.20, 0.72]) back_cover();
            color([0.68, 0.70, 0.74, 1.0])
                magnet_positions()
                    translate([0, 0, magnet_rear_skin])
                        cylinder(d = magnet_d, h = magnet_t);
        }
}

module product_preview() {
    // Flip the shell so its refrigerator-facing product front renders upward.
    mirror([0, 0, 1])
        color([0.90, 0.88, 0.80, 1.0]) front_shell();

    // E-paper surface and lightweight sample UI, for visualization only.
    color([0.96, 0.95, 0.89, 1.0])
        translate([window_x, window_y, 0.025])
            rounded_prism(window_w, window_h, 0.08, window_corner_r);

    color([0.08, 0.22, 0.17, 1.0]) {
        translate([window_x + 5, window_y + window_h - 9, 0.11])
            linear_extrude(height = 0.06)
                text(
                    "FRESH FIRST",
                    size = 4.8,
                    font = "Arial:style=Bold",
                    spacing = 1.05
                );

        for (row = [0 : 2]) {
            row_y = window_y + window_h - 21 - (row * 13);
            translate([window_x + 5, row_y, 0.11])
                rounded_prism(46 - (row * 3), 2.1, 0.06, 1.0);
            translate([window_x + window_w - 21, row_y - 1.0, 0.11])
                rounded_prism(16, 4.0, 0.06, 1.8);
        }
    }
}

if (part == "front") {
    front_shell();
} else if (part == "back") {
    back_cover();
} else if (part == "magnet_test") {
    magnet_fit_test();
} else if (part == "product_preview") {
    product_preview();
} else {
    assembly_preview();
}
