import { getSql } from "../../../../../db";
import { createHash } from "node:crypto";
import type { FridgeItemRow } from "../../../../../db/schema";
import { toFridgeItem } from "../../../../../db/schema";
import {
  generatePairingCode,
  hashPairingCode,
  pairingCodeMatches,
  secretsMatch,
} from "../../../../../lib/device-credentials";
import {
  DISPLAY_ITEM_LIMIT,
  FRIDGE_REFRESH_SECONDS,
  hiddenDisplayItemCount,
} from "../../../../../lib/device-feed";
import { expiryPresentation } from "../../../../../lib/expiry-urgency";
import { formatPairingCode } from "../../../../../lib/pairing-code";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DeviceRow = {
  id: string;
  name: string;
  fridge_id: string | null;
  api_key_hash: string;
  pairing_code_hash: string | null;
  pairing_code_expires_at: string | Date | null;
};

type DisplayItemRow = FridgeItemRow & {
  total_count: number | string;
};

function deviceSecret(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function deviceError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function firmwareVersion(request: Request) {
  const version = request.headers.get("x-firmware-version")?.trim() ?? "";
  return /^[A-Za-z0-9._-]{1,32}$/.test(version) ? version : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const sql = getSql();
  const devices = await sql`
    SELECT id, name, fridge_id, api_key_hash,
           pairing_code_hash, pairing_code_expires_at
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
    const presentedCode = request.headers.get("x-pairing-code") ?? "";
    const expiry = device.pairing_code_expires_at
      ? new Date(device.pairing_code_expires_at).getTime()
      : 0;
    const canReuseCode = Boolean(
      device.pairing_code_hash
      && expiry > Date.now()
      && pairingCodeMatches(device.pairing_code_hash, presentedCode),
    );
    const code = canReuseCode
      ? formatPairingCode(presentedCode)
      : generatePairingCode();
    const expiresInSeconds = canReuseCode
      ? Math.max(1, Math.floor((expiry - Date.now()) / 1000))
      : 1800;
    const version = firmwareVersion(request);

    if (canReuseCode) {
      await sql`
        UPDATE devices
        SET last_seen_at = NOW(), firmware_version = COALESCE(${version}, firmware_version)
        WHERE id = ${device.id}
      `;
    } else {
      await sql`
        UPDATE devices
        SET pairing_code_hash = ${hashPairingCode(code)},
            pairing_code_expires_at = NOW() + INTERVAL '30 minutes',
            last_seen_at = NOW(),
            firmware_version = COALESCE(${version}, firmware_version)
        WHERE id = ${device.id}
      `;
    }
    return Response.json({
      mode: "pairing",
      device: { id: device.id, name: device.name },
      pairingCode: code,
      expiresInSeconds,
      nfcPath: `/d/${device.id}`,
      refreshAfterSeconds: 30,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const fridges = await sql`
    SELECT id, name
    FROM fridges
    WHERE id = ${device.fridge_id}
    LIMIT 1
  ` as Array<{ id: string; name: string }>;
  const rows = await sql`
    SELECT id, name, expires_on, created_at, COUNT(*) OVER() AS total_count
    FROM fridge_items
    WHERE fridge_id = ${device.fridge_id} AND status = 'active'
    ORDER BY expires_on ASC, LOWER(name) ASC, id ASC
    LIMIT ${DISPLAY_ITEM_LIMIT}
  ` as DisplayItemRow[];
  const items = rows.map(toFridgeItem).map((item) => ({
    id: item.id,
    name: item.name,
    expiresOn: item.expiresOn,
    ...expiryPresentation(item.expiresOn),
  }));
  const totalItemCount = Number(rows[0]?.total_count ?? 0);
  const hiddenItemCount = hiddenDisplayItemCount(totalItemCount, items.length);
  const payload = {
    mode: "fridge",
    device: { id: device.id, name: device.name },
    fridge: fridges[0] ?? { id: device.fridge_id, name: "My fridge" },
    items,
    totalItemCount,
    hiddenItemCount,
    generatedAt: new Date().toISOString(),
    refreshAfterSeconds: FRIDGE_REFRESH_SECONDS,
  };
  const etag = `"${createHash("sha256")
    .update(JSON.stringify({ items, hiddenItemCount }))
    .digest("base64url")}"`;

  const version = firmwareVersion(request);
  await sql`
    UPDATE devices
    SET last_seen_at = NOW(), firmware_version = COALESCE(${version}, firmware_version)
    WHERE id = ${device.id}
  `;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "X-Refresh-After": String(FRIDGE_REFRESH_SECONDS),
      },
    });
  }
  return Response.json(payload, {
    headers: {
      "Cache-Control": "private, no-store",
      ETag: etag,
      "X-Refresh-After": String(FRIDGE_REFRESH_SECONDS),
    },
  });
}
