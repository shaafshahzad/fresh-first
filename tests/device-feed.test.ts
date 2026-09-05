import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPLAY_ITEM_LIMIT,
  hiddenDisplayItemCount,
} from "../lib/device-feed";

test("reserves the final e-paper band for overflow context", () => {
  assert.equal(DISPLAY_ITEM_LIMIT, 9);
});

test("reports only items hidden beyond the rendered rows", () => {
  assert.equal(hiddenDisplayItemCount(17, 9), 8);
  assert.equal(hiddenDisplayItemCount(9, 9), 0);
  assert.equal(hiddenDisplayItemCount(4, 4), 0);
});
