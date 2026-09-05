import { getSql } from "./index";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  generateDeviceIdentity,
  hashDeviceSecret,
} from "../lib/device-credentials";

const args = process.argv.slice(2);
const nameParts: string[] = [];
let firmwareHeader = "";
let appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

for (let index = 0; index < args.length; index += 1) {
  const value = args[index];
  if (value === "--firmware-header") {
    firmwareHeader = args[index + 1] ?? "";
    index += 1;
  } else if (value === "--app-url") {
    appUrl = args[index + 1] ?? appUrl;
    index += 1;
  } else {
    nameParts.push(value);
  }
}

if (args.includes("--firmware-header") && !firmwareHeader) {
  throw new Error("--firmware-header requires a file path.");
}

const name = nameParts.join(" ").trim() || "Fridge display";
const { id, secret } = generateDeviceIdentity();
const sql = getSql();

if (firmwareHeader) {
  const destination = resolve(firmwareHeader);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(
    destination,
    [
      "#pragma once",
      "",
      "namespace device_secrets {",
      `static constexpr char kDeviceId[] = "${id}";`,
      `static constexpr char kDeviceSecret[] = "${secret}";`,
      "}  // namespace device_secrets",
      "",
    ].join("\n"),
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );
}

await sql`
  INSERT INTO devices (id, name, api_key_hash)
  VALUES (${id}, ${name}, ${hashDeviceSecret(secret)})
`;

appUrl = appUrl.replace(/\/$/, "");

console.log("Fresh First display provisioned.");
console.log(`Device ID: ${id}`);
if (firmwareHeader) {
  console.log(`Device credentials written to: ${resolve(firmwareHeader)}`);
  console.log("Device secret hidden from terminal output.");
} else {
  console.log(`Device secret: ${secret}`);
}
console.log(`NFC URL: ${appUrl}/d/${id}`);
console.log(
  firmwareHeader
    ? "The generated credentials file is git-ignored; retain a secure manufacturing copy."
    : "Store the device secret in firmware. It will not be shown again.",
);
