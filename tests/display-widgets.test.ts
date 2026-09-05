import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DISPLAY_HEADER,
  displayWidgetText,
  normalizeDisplayHeader,
  resolveDisplayHeader,
} from "../lib/display-widgets";

const context = {
  fridgeName: "Kitchen fridge",
  nextItemName: "Milk",
  itemCount: 12,
  attentionCount: 3,
};

test("keeps the current Fresh First and fridge-name header as the default", () => {
  assert.deepEqual(normalizeDisplayHeader("unknown", null), DEFAULT_DISPLAY_HEADER);
  assert.deepEqual(resolveDisplayHeader(DEFAULT_DISPLAY_HEADER, context), {
    left: { widget: "brand", text: "FRESH FIRST" },
    right: { widget: "fridge_name", text: "KITCHEN FRIDGE" },
  });
});

test("resolves live fridge data for each configurable widget", () => {
  assert.equal(displayWidgetText("next_item", context), "Milk");
  assert.equal(displayWidgetText("item_count", context), "12 ITEMS");
  assert.equal(displayWidgetText("attention_count", context), "3 USE SOON");
});

test("gives empty fridges useful header states", () => {
  const empty = { ...context, nextItemName: null, itemCount: 0, attentionCount: 0 };
  assert.equal(displayWidgetText("next_item", empty), "ALL FRESH");
  assert.equal(displayWidgetText("item_count", empty), "0 ITEMS");
  assert.equal(displayWidgetText("attention_count", empty), "ALL FRESH");
});
