import { getSql } from "./index";
import {
  generateDeviceIdentity,
  hashDeviceSecret,
} from "../lib/device-credentials";

const name = process.argv.slice(2).join(" ").trim() || "Fridge display";
const { id, secret } = generateDeviceIdentity();
const sql = getSql();

await sql`
  INSERT INTO devices (id, name, api_key_hash)
  VALUES (${id}, ${name}, ${hashDeviceSecret(secret)})
`;

const appUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

console.log("Fresh First display provisioned.");
console.log(`Device ID: ${id}`);
console.log(`Device secret: ${secret}`);
console.log(`NFC URL: ${appUrl}/d/${id}`);
console.log("Store the device secret in firmware. It will not be shown again.");
