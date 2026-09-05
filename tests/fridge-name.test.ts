import assert from "node:assert/strict";
import test from "node:test";
import { defaultFridgeName } from "../lib/fridge-name";

test("uses the account holder's name for a new fridge", () => {
  assert.equal(defaultFridgeName("Shaaf"), "Shaaf's fridge");
  assert.equal(defaultFridgeName("James"), "James' fridge");
});

test("keeps a neutral fallback when an account has no usable name", () => {
  assert.equal(defaultFridgeName("   "), "My fridge");
  assert.equal(defaultFridgeName(null), "My fridge");
});
