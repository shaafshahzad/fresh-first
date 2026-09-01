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
