import assert from "node:assert/strict";
import test from "node:test";
import { parseQuickItems, parseQuickLine } from "../lib/quick-add";

const now = new Date(2026, 8, 1, 12, 0, 0);

test("parses common natural-language expiry dates", () => {
  assert.deepEqual(parseQuickLine("Milk tomorrow", now), {
    name: "Milk",
    expiresOn: "2026-09-02",
    source: "Milk tomorrow",
  });
  assert.equal(parseQuickLine("Tortillas Sep 4", now)?.expiresOn, "2026-09-04");
  assert.equal(parseQuickLine("Bread 2026/09/05", now)?.expiresOn, "2026-09-05");
  assert.equal(parseQuickLine("Yogurt Friday", now)?.expiresOn, "2026-09-04");
  assert.equal(parseQuickLine("Leftovers in 3 days", now)?.expiresOn, "2026-09-04");
});

test("keeps numbers in product names", () => {
  assert.equal(parseQuickLine("Milk 2% tomorrow", now)?.name, "Milk 2%");
});

test("parses several lines and isolates ambiguous input", () => {
  const result = parseQuickItems(
    "Milk tomorrow\nTortillas Sep 4\nMystery leftovers",
    now,
  );

  assert.deepEqual(
    result.items.map(({ name, expiresOn }) => ({ name, expiresOn })),
    [
      { name: "Milk", expiresOn: "2026-09-02" },
      { name: "Tortillas", expiresOn: "2026-09-04" },
    ],
  );
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].line, "Mystery leftovers");
});

test("parses a continuous voice grocery session", () => {
  const result = parseQuickItems(
    [
      "orange juice 27 October 2026.",
      "cream cheese 2026 November 9th",
      "Greek yogurts 2026 September 25th",
    ].join("\n"),
    now,
  );

  assert.deepEqual(
    result.items.map(({ name, expiresOn }) => ({ name, expiresOn })),
    [
      { name: "orange juice", expiresOn: "2026-10-27" },
      { name: "cream cheese", expiresOn: "2026-11-09" },
      { name: "Greek yogurts", expiresOn: "2026-09-25" },
    ],
  );
  assert.deepEqual(result.errors, []);
});

test("parses punctuation emitted by server-side transcription", () => {
  assert.deepEqual(parseQuickLine("Cream cheese, 9 November 2026.", now), {
    name: "Cream cheese",
    expiresOn: "2026-11-09",
    source: "Cream cheese, 9 November 2026",
  });
});
