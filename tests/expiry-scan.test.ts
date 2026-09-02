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

test("extracts standardized bilingual best-before month codes", () => {
  assert.equal(extractExpiryCandidates("2026 NO 09\n06:03 H7", now)[0]?.isoDate, "2026-11-09");
  assert.equal(extractExpiryCandidates("26 OC 27\n336 Z 1516", now)[0]?.isoDate, "2026-10-27");
  assert.equal(extractExpiryCandidates("2026 SE 25", now)[0]?.isoDate, "2026-09-25");
});

test("recovers a partially dropped year digit from a standardized stamp", () => {
  const candidate = extractExpiryCandidates("6 OC 27", now)[0];
  assert.equal(candidate?.isoDate, "2026-10-27");
  assert.equal(candidate?.confidence, "review");
  assert.equal(extractExpiryCandidates("026 SE 25", now)[0]?.isoDate, "2026-09-25");
});

test("supports international numeric date orders and separators", () => {
  assert.equal(extractExpiryCandidates("EXP 2026.09.04", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("EXP 31/10/2026", now)[0]?.isoDate, "2026-10-31");
  assert.equal(extractExpiryCandidates("EXP 10/31/2026", now)[0]?.isoDate, "2026-10-31");
  assert.equal(extractExpiryCandidates("EXP 2026年9月4日", now)[0]?.isoDate, "2026-09-04");
});

test("retains both interpretations of an ambiguous numeric date", () => {
  const candidates = extractExpiryCandidates("EXP 04/09/2026", now);
  assert.deepEqual(
    new Set(candidates.map((candidate) => candidate.isoDate)),
    new Set(["2026-09-04", "2026-04-09"]),
  );
  assert.ok(candidates.every((candidate) => candidate.confidence === "review"));
});

test("normalizes localized numeral systems", () => {
  assert.equal(extractExpiryCandidates("٢٠٢٦/٠٩/٠٤", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("२०२६-०९-०४", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("๒๕๖๙-๐๙-๐๔", now)[0]?.isoDate, "2026-09-04");
});

test("supports localized month names", () => {
  assert.equal(extractExpiryCandidates("4 septembre 2026", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("4 septiembre 2026", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("4. Oktober 2026", now)[0]?.isoDate, "2026-10-04");
  assert.equal(extractExpiryCandidates("4 Eylul 2026", now)[0]?.isoDate, "2026-09-04");
});

test("supports compact, Roman-month, ordinal, and ISO-week stamps", () => {
  assert.equal(extractExpiryCandidates("EXP 20260904", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("EXP 260904", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("EXP 04-IX-2026", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("EXP 2026-247", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("EXP 2026-W36-5", now)[0]?.isoDate, "2026-09-04");
});

test("supports month-only and uncommon calendar-year stamps", () => {
  assert.equal(extractExpiryCandidates("EXP 09/2026", now)[0]?.isoDate, "2026-09-30");
  assert.equal(extractExpiryCandidates("EXP September 2026", now)[0]?.isoDate, "2026-09-30");
  assert.equal(extractExpiryCandidates("EXP 2569-09-04", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("EXP R8.9.4", now)[0]?.isoDate, "2026-09-04");
  assert.equal(extractExpiryCandidates("民國115年9月4日", now)[0]?.isoDate, "2026-09-04");
});

test("rejects impossible and implausibly distant dates", () => {
  assert.deepEqual(extractExpiryCandidates("EXP 2026-02-30", now), []);
  assert.deepEqual(extractExpiryCandidates("EXP 2040-09-01", now), []);
  assert.deepEqual(extractExpiryCandidates("LOT NO 25", now), []);
});
