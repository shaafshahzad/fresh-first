import assert from "node:assert/strict";
import test from "node:test";
import {
  generateDeviceIdentity,
  generatePairingCode,
  hashDeviceSecret,
  hashPairingCode,
  pairingCodeMatches,
  secretsMatch,
} from "../lib/device-credentials";
import { formatPairingCode, normalizePairingCode } from "../lib/pairing-code";

test("normalizes pairing codes for forgiving mobile entry", () => {
  assert.equal(normalizePairingCode(" abcd-23 45 "), "ABCD2345");
  assert.equal(formatPairingCode("abcd2345extra"), "ABCD-2345");
});

test("generates readable eight-character pairing codes", () => {
  const code = generatePairingCode();
  assert.match(code, /^[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/);
});

test("hashes pairing codes consistently without storing the code", () => {
  const secret = "test-pairing-secret-at-least-thirty-two-characters";
  const codeHash = hashPairingCode("ABCD-2345", secret);
  assert.equal(
    codeHash,
    hashPairingCode("abcd 2345", secret),
  );
  assert.notEqual(
    codeHash,
    hashPairingCode("ABCD-2346", secret),
  );
  assert.equal(pairingCodeMatches(codeHash, "abcd 2345", secret), true);
  assert.equal(pairingCodeMatches(codeHash, "ABCD-2346", secret), false);
  assert.equal(pairingCodeMatches(codeHash, "short", secret), false);
});

test("generates device credentials and verifies secrets safely", () => {
  const device = generateDeviceIdentity();
  const hash = hashDeviceSecret(device.secret);
  assert.match(device.id, /^FF-[23456789A-HJ-NP-Z]{8}$/);
  assert.equal(secretsMatch(hash, device.secret), true);
  assert.equal(secretsMatch(hash, `${device.secret}x`), false);
});
