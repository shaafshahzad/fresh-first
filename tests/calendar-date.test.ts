import assert from "node:assert/strict";
import test from "node:test";
import {
  daysUntilCalendarDate,
  formatCalendarDate,
  parseCalendarDate,
} from "../lib/calendar-date";

test("parses calendar dates without relying on browser date-string parsing", () => {
  const date = parseCalendarDate("2026-09-04");
  assert.equal(date?.getFullYear(), 2026);
  assert.equal(date?.getMonth(), 8);
  assert.equal(date?.getDate(), 4);
});

test("accepts an ISO timestamp returned by a database driver", () => {
  assert.equal(
    formatCalendarDate("2026-09-04T00:00:00.000Z", {
      month: "short",
      day: "numeric",
    }),
    "Sep 4",
  );
});

test("fails safely for malformed dates", () => {
  assert.equal(parseCalendarDate("2026-02-30"), null);
  assert.equal(daysUntilCalendarDate("not-a-date"), null);
  assert.equal(formatCalendarDate("not-a-date", { month: "short" }), "Date unavailable");
});

test("calculates expiry distance from local calendar days", () => {
  assert.equal(
    daysUntilCalendarDate("2026-09-04", new Date(2026, 8, 1, 23, 45)),
    3,
  );
});
