import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPLAY_ITEM_LIMIT,
  FRIDGE_REFRESH_SECONDS,
  hiddenDisplayItemCount,
} from "../lib/device-feed";

test("reserves the final e-paper band for overflow context", () => {
  assert.equal(DISPLAY_ITEM_LIMIT, 9);
});

test("checks the fridge feed every fifteen seconds", () => {
  assert.equal(FRIDGE_REFRESH_SECONDS, 15);
});

test("reports only items hidden beyond the rendered rows", () => {
  assert.equal(hiddenDisplayItemCount(17, 9), 8);
  assert.equal(hiddenDisplayItemCount(9, 9), 0);
  assert.equal(hiddenDisplayItemCount(4, 4), 0);
});
