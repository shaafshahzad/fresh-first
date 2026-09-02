import assert from "node:assert/strict";
import test from "node:test";
import { extractExpiryCandidates } from "../lib/expiry-scan";

const now = new Date(2026, 8, 1, 12, 0, 0);

test("extracts common printed expiry formats", () => {
  assert.equal(extractExpiryCandidates("BEST BEFORE 2026/09/04", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("EXP 20260905 LOT A12", now)[0]?.isoDate, "2026-09-05");
  assert.equal(extractExpiryCandidates("USE BY 6 SEPT 2026", now)[0]?.isoDate, "2026-09-06");
  assert.equal(extractExpiryCandidates("OCT 2 2026", now)[0]?.isoDate, "2026-10-02");
});

test("marks ambiguous numeric dates for review", () => {
  const candidate = extractExpiryCandidates("BB 04/09/26", now)[0];
  assert.equal(candidate?.isoDate, "2026-09-04");
  assert.equal(candidate?.confidence, "review");
});

test("corrects common OCR substitutions in numeric dates", () => {
  assert.equal(extractExpiryCandidates("EXP 2O26-O9-O8", now)[0]?.isoDate, "2026-09-08");
});

test("rejects impossible and implausibly distant dates", () => {
  assert.deepEqual(extractExpiryCandidates("EXP 2026-02-30", now), []);
  assert.deepEqual(extractExpiryCandidates("EXP 2035-09-01", now), []);
});
