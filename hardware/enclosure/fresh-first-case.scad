/*
 * Fresh First 4.2-inch e-paper enclosure
 *
 * Prototype enclosure for:
 *   - Waveshare 4.2-inch 400 x 300 e-paper module (103 x 78.5 mm PCB)
 *   - generic 30-pin ESP32 DevKit (29 x 52 mm envelope)
 *   - 50 x 34 x 10 mm protected LiPo
 *   - TP4056 USB-C charger/protection board
 *   - MT3608 5 V boost board
 *   - MAX17043 battery gauge board
 *   - SS12F44-G5 slide power switch (large switch from the DAOKI kit)
 *   - 25 mm round adhesive NTAG215 sticker
 *   - four 20 x 3 mm disc magnets
 *
 * The removable rear cover is also the electronics carrier. Its component
 * features print upward with the fridge-facing surface on the print bed.
 */

$fn = 72;

// Select: "front", "back", "assembly", "carrier_preview",
//         "product_preview", "magnet_test", "nfc_test", "switch_test"
part = "assembly";

// Purchased display module
pcb_w = 103.0;
pcb_h = 78.5;
pcb_t = 1.6;
pcb_clearance = 0.55;

// Visible e-paper area. Adjust after a physical dry fit if required.
window_w = 86.2;
window_h = 64.8;
window_bottom_offset = 8.0;
window_corner_r = 1.4;

// Case envelope
side_margin = 8.5;
top_margin = 8.5;
nfc_chin = 34.0;
case_w = pcb_w + (2 * side_margin);             // 120.0 mm
case_h = pcb_h + (2 * top_margin) + nfc_chin;   // 129.5 mm
case_r = 12.0;
shell_depth = 38.0;
face_t = 2.2;
wall = 2.4;

// Inset removable rear cover
cover_t = 4.0;
cover_rebate = 1.2;
cover_clearance = 0.25;
cover_inset = cover_rebate + cover_clearance;

// Magnets: 20 x 3 mm discs, installed from inside the rear cover.
magnet_d = 20.0;
magnet_t = 3.0;
magnet_d_clearance = 0.40;
magnet_t_clearance = 0.20;
magnet_rear_skin = 0.65;
magnet_edge_offset = 14.5;

// NFC: Timeskey NTAG215 round adhesive sticker, Amazon ASIN B0CPJ5DDCQ.
nfc_tag_d = 25.0;
nfc_tag_t = 0.35;
nfc_diametral_clearance = 0.80;
nfc_pocket_d = nfc_tag_d + nfc_diametral_clearance;
nfc_pocket_depth = 0.60;
nfc_front_skin = face_t - nfc_pocket_depth;
nfc_center_x = case_w / 2;
nfc_center_y = 22.0;
nfc_notch_w = 5.0;
nfc_notch_h = 7.0;

// Power switch: larger SS12F44-G5 from Amazon ASIN B08SLQ1KBX.
// It mounts behind the lower edge, left of center, with its 5 mm actuator
// passing through the shell. The smaller 3 mm switch is not used.
switch_body_l = 12.2;
switch_body_w = 5.9;
switch_body_depth = 6.0;
switch_body_clearance = 0.50;
switch_actuator_l = 3.0;
switch_actuator_w = 3.0;
switch_travel = 3.2;
switch_slot_clearance = 0.80;
switch_slot_l = switch_actuator_l + switch_travel + switch_slot_clearance;
switch_slot_h = switch_actuator_w + switch_slot_clearance;
switch_center_x = 34.0;
switch_center_z = 8.0;
switch_mount_depth = switch_body_depth + 1.2;
switch_mount_rail = 1.4;

// Display placement inside the front shell
pcb_x = (case_w - pcb_w) / 2;
// Physical fit revision: move the PCB/retaining rails 5 mm toward the lower
// chin while leaving the exterior display window in its original position.
pcb_fit_shift_y = -5.0;
pcb_reference_y = top_margin + nfc_chin;
pcb_y = pcb_reference_y + pcb_fit_shift_y;
window_x = pcb_x + ((pcb_w - window_w) / 2);
window_y = pcb_reference_y + window_bottom_offset;

// Four M2.5 self-tapping rear-cover screws, clear of magnets and carriers.
screw_d = 2.8;
screw_head_d = 5.4;
screw_head_h = 1.5;
pilot_d = 2.05;
boss_d = 6.0;
screw_x_left = 5.25;
screw_x_right = case_w - 5.25;
screw_y_low = 32.0;
screw_y_high = 103.0;
screw_points = [
    [screw_x_left, screw_y_low],
    [screw_x_left, screw_y_high],
    [screw_x_right, screw_y_low],
    [screw_x_right, screw_y_high]
];

// Electronics envelopes. Coordinates are on the inside of the rear carrier.
carrier_riser = 1.2;
carrier_wall = 1.4;
carrier_corner = 5.0;
carrier_lip_h = 2.6;

esp32_x = 12.0;
esp32_y = 44.0;
esp32_w = 29.0;
esp32_h = 52.0;
esp32_t = 1.6;
esp32_clearance = 0.9;

battery_x = 48.0;
battery_y = 67.0;
battery_w = 34.0;
battery_h = 50.0;
battery_t = 10.0;
battery_clearance = 1.2;

boost_x = 48.0;
boost_y = 44.0;
boost_w = 36.0;
boost_h = 17.0;
boost_t = 14.0;
boost_clearance = 1.0;

charger_x = 87.0;
charger_y = 44.0;
charger_w = 26.0;
charger_h = 17.0;
charger_t = 5.0;
charger_clearance = 1.0;

gauge_x = 88.0;
gauge_y = 69.0;
gauge_w = 25.0;
gauge_h = 20.0;
gauge_t = 6.0;
gauge_clearance = 1.0;

// The supplied female Dupont ends are approximately 15-20 mm long.
// Model the worst case plus room for the wire to start bending sideways.
dupont_body_h = 20.0;
wire_bend_allowance = 4.0;
display_keepout_z = face_t + pcb_t + 0.6;
carrier_available_h = (shell_depth - cover_t) - display_keepout_z;
esp32_required_h = carrier_riser + esp32_t + dupont_body_h + wire_bend_allowance;

assert(
    carrier_available_h >= esp32_required_h,
    "Increase shell_depth: ESP32 Dupont connectors do not have enough clearance"
);

// USB-C charge opening aligned with the TP4056 board on the right wall.
charge_slot_y = charger_y + 2.5;
charge_slot_length = 12.0;
charge_slot_height = 9.0;
charge_slot_z = shell_depth - cover_t - 7.0;

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

module nfc_pocket_cut(center_x, center_y) {
    translate([center_x, center_y, nfc_front_skin])
        cylinder(d = nfc_pocket_d, h = nfc_pocket_depth + eps);

    // Side notch gives tweezers access if the sticker must be replaced.
    translate([
        center_x + (nfc_pocket_d / 2) - 1.2,
        center_y - (nfc_notch_h / 2),
        nfc_front_skin
    ])
        rounded_prism(
            nfc_notch_w,
            nfc_notch_h,
            nfc_pocket_depth + eps,
            1.6
        );
}

module switch_slot_cut() {
    translate([
        switch_center_x - (switch_slot_l / 2),
        -eps,
        switch_center_z - (switch_slot_h / 2)
    ])
        cube([switch_slot_l, wall + (2 * eps), switch_slot_h]);
}

module switch_mount() {
    opening_l = switch_body_l + switch_body_clearance;
    opening_w = switch_body_w + switch_body_clearance;
    x0 = switch_center_x - (opening_l / 2);
    z0 = switch_center_z - (opening_w / 2);
    y0 = wall - 0.30;

    // Open-backed guide tunnel: the switch slides toward the lower wall and
    // its three solder pins remain accessible from inside the enclosure.
    translate([
        x0 - switch_mount_rail,
        y0,
        z0 - switch_mount_rail
    ])
        cube([
            opening_l + (2 * switch_mount_rail),
            switch_mount_depth,
            switch_mount_rail
        ]);
    translate([
        x0 - switch_mount_rail,
        y0,
        z0 + opening_w
    ])
        cube([
            opening_l + (2 * switch_mount_rail),
            switch_mount_depth,
            switch_mount_rail
        ]);
    translate([
        x0 - switch_mount_rail,
        y0,
        z0 - switch_mount_rail
    ])
        cube([
            switch_mount_rail,
            switch_mount_depth,
            opening_w + (2 * switch_mount_rail)
        ]);
    translate([
        x0 + opening_l,
        y0,
        z0 - switch_mount_rail
    ])
        cube([
            switch_mount_rail,
            switch_mount_depth,
            opening_w + (2 * switch_mount_rail)
        ]);
}

module screw_bosses() {
    for (point = screw_points) {
        difference() {
            translate([point[0], point[1], face_t])
                cylinder(d = boss_d, h = shell_depth - cover_t - face_t + 0.25);
            translate([point[0], point[1], shell_depth - cover_t - 8.0])
                cylinder(d = pilot_d, h = 8.3);
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

    // Short rails avoid the connector and allow the display to lift out.
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

        // Main cavity, leaving the front face and perimeter walls.
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

        // Shallow circular landing opens inside for the adhesive NFC sticker.
        nfc_pocket_cut(nfc_center_x, nfc_center_y);

        // Charging connector access at the right edge.
        translate([case_w - wall - eps, charge_slot_y, charge_slot_z])
            cube([wall + (2 * eps), charge_slot_length, charge_slot_height]);

        // Bottom-edge opening for the large slide-switch actuator.
        switch_slot_cut();

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
        switch_mount();
    }
}

module magnet_positions() {
    for (x = [magnet_edge_offset, case_w - magnet_edge_offset])
        for (y = [magnet_edge_offset, case_h - magnet_edge_offset])
            translate([x, y, 0]) children();
}

module corner_locator(x, y, w, h, clearance) {
    outer_w = w + clearance;
    outer_h = h + clearance;
    x0 = x - (clearance / 2);
    y0 = y - (clearance / 2);
    z0 = cover_t;

    // Four short L-shaped stops leave board edges and connectors accessible.
    translate([x0 - carrier_wall, y0 - carrier_wall, z0]) {
        cube([carrier_wall, carrier_corner, carrier_lip_h]);
        cube([carrier_corner, carrier_wall, carrier_lip_h]);
    }
    translate([x0 + outer_w, y0 - carrier_wall, z0])
        cube([carrier_wall, carrier_corner, carrier_lip_h]);
    translate([x0 + outer_w - carrier_corner, y0 - carrier_wall, z0])
        cube([carrier_corner + carrier_wall, carrier_wall, carrier_lip_h]);
    translate([x0 - carrier_wall, y0 + outer_h - carrier_corner, z0])
        cube([carrier_wall, carrier_corner + carrier_wall, carrier_lip_h]);
    translate([x0 - carrier_wall, y0 + outer_h, z0])
        cube([carrier_corner, carrier_wall, carrier_lip_h]);
    translate([x0 + outer_w, y0 + outer_h - carrier_corner, z0])
        cube([carrier_wall, carrier_corner + carrier_wall, carrier_lip_h]);
    translate([x0 + outer_w - carrier_corner, y0 + outer_h, z0])
        cube([carrier_corner + carrier_wall, carrier_wall, carrier_lip_h]);
}

module carrier_pads(x, y, w, h) {
    pad = 4.0;
    for (px = [x + 1.0, x + w - pad - 1.0])
        for (py = [y + 1.0, y + h - pad - 1.0])
            translate([px, py, cover_t])
                cube([pad, pad, carrier_riser]);
}

module component_carrier(x, y, w, h, clearance) {
    carrier_pads(x, y, w, h);
    corner_locator(x, y, w, h, clearance);
}

module battery_cradle() {
    x0 = battery_x - (battery_clearance / 2);
    y0 = battery_y - (battery_clearance / 2);
    outer_w = battery_w + battery_clearance;
    outer_h = battery_h + battery_clearance;
    cradle_h = 3.0;

    difference() {
        translate([x0 - carrier_wall, y0 - carrier_wall, cover_t])
            rounded_prism(
                outer_w + (2 * carrier_wall),
                outer_h + (2 * carrier_wall),
                cradle_h,
                2.0
            );
        translate([x0, y0, cover_t - eps])
            rounded_prism(outer_w, outer_h, cradle_h + (2 * eps), 1.2);
        // Lead exit toward the power boards.
        translate([x0 + outer_w - 8.0, y0 - carrier_wall - eps, cover_t - eps])
            cube([8.0, (2 * carrier_wall) + eps, cradle_h + (2 * eps)]);
    }
}

module wire_guide_pair(x, y) {
    for (dx = [0, 6.5])
        translate([x + dx, y, cover_t])
            cylinder(d = 2.6, h = 4.0);
}

module carrier_label(label, x, y, size = 2.8) {
    translate([x, y, cover_t])
        linear_extrude(height = 0.45)
            text(label, size = size, font = "Arial:style=Bold");
}

module electronics_carriers() {
    // ESP32 is raised for solder joints; open stops preserve header access.
    component_carrier(esp32_x, esp32_y, esp32_w, esp32_h, esp32_clearance);
    component_carrier(boost_x, boost_y, boost_w, boost_h, boost_clearance);
    component_carrier(charger_x, charger_y, charger_w, charger_h, charger_clearance);
    component_carrier(gauge_x, gauge_y, gauge_w, gauge_h, gauge_clearance);
    battery_cradle();

    wire_guide_pair(85.0, 96.0);
    wire_guide_pair(85.0, 108.0);

    carrier_label("ESP32", 17.0, 98.5);
    carrier_label("BOOST", 53.0, 63.0, 2.4);
    carrier_label("CHARGE", 89.0, 63.0, 2.2);
    carrier_label("GAUGE", 91.0, 91.5, 2.3);
    carrier_label("BATTERY", 55.0, 120.0, 2.5);
}

module back_cover_base() {
    cover_w = case_w - (2 * cover_inset);
    cover_h = case_h - (2 * cover_inset);
    cover_r = case_r - cover_inset;

    difference() {
        translate([cover_inset, cover_inset, 0])
            rounded_prism(cover_w, cover_h, cover_t, cover_r);

        // Blind magnet pockets leave plastic between magnet and refrigerator.
        magnet_positions()
            translate([0, 0, magnet_rear_skin])
                cylinder(
                    d = magnet_d + magnet_d_clearance,
                    h = cover_t - magnet_rear_skin + eps
                );

        // Through-holes and countersinks keep screw heads off the fridge.
        for (point = screw_points) {
            translate([point[0], point[1], -eps])
                cylinder(d = screw_d, h = cover_t + (2 * eps));
            translate([point[0], point[1], -eps])
                cylinder(d1 = screw_head_d, d2 = screw_d, h = screw_head_h + eps);
        }
    }
}

module back_cover() {
    union() {
        back_cover_base();
        electronics_carriers();
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

module nfc_fit_test() {
    test_w = 34.0;
    difference() {
        rounded_prism(test_w, test_w, face_t, 4.0);
        nfc_pocket_cut(test_w / 2, test_w / 2);
    }
}

module switch_fit_test() {
    // Crop the production shell around the switch so the wall, slot, and
    // open-backed guide can be tested without printing the whole enclosure.
    intersection() {
        front_shell();
        translate([switch_center_x - 11.0, -eps, 0])
            cube([22.0, 15.0 + eps, 16.0]);
    }
}

module component_placeholders(show_dupont = true) {
    color([0.08, 0.18, 0.15, 0.92])
        translate([esp32_x, esp32_y, cover_t + carrier_riser])
            cube([esp32_w, esp32_h, esp32_t]);

    color([0.16, 0.48, 0.25, 0.90])
        translate([boost_x, boost_y, cover_t + carrier_riser])
            cube([boost_w, boost_h, boost_t]);

    color([0.12, 0.32, 0.58, 0.90])
        translate([charger_x, charger_y, cover_t + carrier_riser])
            cube([charger_w, charger_h, charger_t]);

    color([0.25, 0.45, 0.60, 0.90])
        translate([gauge_x, gauge_y, cover_t + carrier_riser])
            cube([gauge_w, gauge_h, gauge_t]);

    color([0.72, 0.48, 0.26, 0.86])
        translate([battery_x, battery_y, cover_t])
            rounded_prism(battery_w, battery_h, battery_t, 2.0);

    if (show_dupont) {
        // Worst-case 20 mm connector bodies on both ESP32 header rows.
        color([0.12, 0.12, 0.12, 0.85]) {
            translate([
                esp32_x + 1.0,
                esp32_y + 3.0,
                cover_t + carrier_riser + esp32_t
            ]) cube([3.0, esp32_h - 6.0, dupont_body_h]);
            translate([
                esp32_x + esp32_w - 4.0,
                esp32_y + 3.0,
                cover_t + carrier_riser + esp32_t
            ]) cube([3.0, esp32_h - 6.0, dupont_body_h]);
        }
    }
}

module switch_placeholder() {
    opening_l = switch_body_l + switch_body_clearance;
    opening_w = switch_body_w + switch_body_clearance;
    x0 = switch_center_x - (switch_body_l / 2);
    z0 = switch_center_z - (switch_body_w / 2);

    color([0.55, 0.57, 0.59, 0.95])
        translate([x0, wall, z0])
            cube([switch_body_l, switch_body_depth, switch_body_w]);
    color([0.08, 0.08, 0.08, 1.0])
        translate([
            switch_center_x - (switch_actuator_l / 2),
            wall - 5.0,
            switch_center_z - (switch_actuator_w / 2)
        ])
            cube([switch_actuator_l, 5.0, switch_actuator_w]);
}

module assembly_preview() {
    color([0.90, 0.88, 0.80, 0.55]) front_shell();
    switch_placeholder();

    color([0.08, 0.25, 0.20, 0.72])
        translate([pcb_x, pcb_y, face_t + 0.15])
            cube([pcb_w, pcb_h, pcb_t]);

    color([0.96, 0.95, 0.89, 1.0])
        translate([window_x, window_y, 0.10])
            cube([window_w, window_h, 0.20]);

    color([0.13, 0.55, 0.40, 0.85])
        translate([nfc_center_x, nfc_center_y, nfc_front_skin])
            cylinder(d = nfc_tag_d, h = nfc_tag_t);

    // Lift and invert rear cover so its carriers face the shell.
    preview_gap = 18;
    translate([0, 0, shell_depth + preview_gap + cover_t])
        mirror([0, 0, 1]) {
            color([0.20, 0.20, 0.20, 0.70]) back_cover();
            component_placeholders();
            color([0.68, 0.70, 0.74, 1.0])
                magnet_positions()
                    translate([0, 0, magnet_rear_skin])
                        cylinder(d = magnet_d, h = magnet_t);
        }
}

module carrier_preview() {
    color([0.90, 0.88, 0.80, 0.90]) back_cover();
    component_placeholders();
}

module product_preview() {
    // Flip the shell so the refrigerator-facing product front renders upward.
    mirror([0, 0, 1])
        color([0.90, 0.88, 0.80, 1.0]) front_shell();

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
} else if (part == "nfc_test") {
    nfc_fit_test();
} else if (part == "switch_test") {
    switch_fit_test();
} else if (part == "product_preview") {
    product_preview();
} else if (part == "carrier_preview") {
    carrier_preview();
} else {
    assembly_preview();
}
