import { getSql } from "../../../../../db";
import { createHash } from "node:crypto";
import type { FridgeItemRow } from "../../../../../db/schema";
import { toFridgeItem } from "../../../../../db/schema";
import {
  generatePairingCode,
  hashPairingCode,
  secretsMatch,
} from "../../../../../lib/device-credentials";
import { expiryPresentation } from "../../../../../lib/expiry-urgency";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DeviceRow = {
  id: string;
  name: string;
  fridge_id: string | null;
  api_key_hash: string;
};

function deviceSecret(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function deviceError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const sql = getSql();
  const devices = await sql`
    SELECT id, name, fridge_id, api_key_hash
    FROM devices
    WHERE id = ${deviceId.toUpperCase()}
    LIMIT 1
  ` as DeviceRow[];
  const device = devices[0];
  const secret = deviceSecret(request);
  if (!device || !secret || !secretsMatch(device.api_key_hash, secret)) {
    return deviceError("Device authentication failed.", 401);
  }

  if (!device.fridge_id) {
    const code = generatePairingCode();
    await sql`
      UPDATE devices
      SET pairing_code_hash = ${hashPairingCode(code)},
          pairing_code_expires_at = NOW() + INTERVAL '30 minutes',
          last_seen_at = NOW()
      WHERE id = ${device.id}
    `;
    return Response.json({
      mode: "pairing",
      device: { id: device.id, name: device.name },
      pairingCode: code,
      expiresInSeconds: 1800,
      nfcPath: `/d/${device.id}`,
      refreshAfterSeconds: 900,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const fridges = await sql`
    SELECT id, name
    FROM fridges
    WHERE id = ${device.fridge_id}
    LIMIT 1
  ` as Array<{ id: string; name: string }>;
  const rows = await sql`
    SELECT id, name, expires_on, created_at
    FROM fridge_items
    WHERE fridge_id = ${device.fridge_id} AND status = 'active'
    ORDER BY expires_on ASC, LOWER(name) ASC, id ASC
    LIMIT 12
  ` as FridgeItemRow[];
  const items = rows.map(toFridgeItem).map((item) => ({
    id: item.id,
    name: item.name,
    expiresOn: item.expiresOn,
    ...expiryPresentation(item.expiresOn),
  }));
  const payload = {
    mode: "fridge",
    device: { id: device.id, name: device.name },
    fridge: fridges[0] ?? { id: device.fridge_id, name: "My fridge" },
    items,
    generatedAt: new Date().toISOString(),
    refreshAfterSeconds: 900,
  };
  const etag = `"${createHash("sha256").update(JSON.stringify(items)).digest("base64url")}"`;

  await sql`UPDATE devices SET last_seen_at = NOW() WHERE id = ${device.id}`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return Response.json(payload, {
    headers: {
      "Cache-Control": "private, no-store",
      ETag: etag,
      "X-Refresh-After": "900",
    },
  });
}
