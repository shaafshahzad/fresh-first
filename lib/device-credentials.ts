import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { formatPairingCode, normalizePairingCode } from "./pairing-code";

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOCAL_PAIRING_SECRET = "fresh-first-local-pairing-secret-change-before-production";

function randomCode(length: number) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function generatePairingCode() {
  return formatPairingCode(randomCode(8));
}

export { normalizePairingCode } from "./pairing-code";

export function generateDeviceIdentity() {
  return {
    id: `FF-${randomCode(8)}`,
    secret: randomBytes(32).toString("base64url"),
  };
}

export function hashDeviceSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function pairingSecret() {
  const secret = process.env.DEVICE_PAIRING_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DEVICE_PAIRING_SECRET or BETTER_AUTH_SECRET is required.");
  }
  return LOCAL_PAIRING_SECRET;
}

export function hashPairingCode(code: string, secret = pairingSecret()) {
  return createHmac("sha256", secret)
    .update(`fresh-first-pair:${normalizePairingCode(code)}`)
    .digest("hex");
}

export function secretsMatch(expectedHash: string, providedSecret: string) {
  const providedHash = hashDeviceSecret(providedSecret);
  const expected = Buffer.from(expectedHash, "hex");
  const provided = Buffer.from(providedHash, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
