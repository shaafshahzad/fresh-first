import assert from "node:assert/strict";
import test from "node:test";
import { expiryPresentation } from "../lib/expiry-urgency";

const NOW = new Date(2026, 8, 2, 12, 0, 0);

test("maps expiry dates to the intended urgency bands", () => {
  assert.deepEqual(expiryPresentation("2026-09-01", NOW), {
    days: -1,
    marker: "Expired",
    timing: "Expired yesterday",
    tone: "expired",
  });
  assert.equal(expiryPresentation("2026-09-02", NOW).tone, "urgent");
  assert.equal(expiryPresentation("2026-09-03", NOW).marker, "Use tomorrow");
  assert.equal(expiryPresentation("2026-09-05", NOW).tone, "soon");
  assert.equal(expiryPresentation("2026-09-07", NOW).tone, "warning");
  assert.equal(expiryPresentation("2026-09-08", NOW).tone, "later");
});

test("fails quietly when the expiry date is invalid", () => {
  assert.deepEqual(expiryPresentation("not-a-date", NOW), {
    days: null,
    marker: null,
    timing: "Expiry date unavailable",
    tone: "later",
  });
});
