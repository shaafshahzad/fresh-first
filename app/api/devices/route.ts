import { getSql } from "../../../db";
import { getOrCreateDefaultFridge } from "../../../db/fridges";
import { hashPairingCode, normalizePairingCode } from "../../../lib/device-credentials";
import { getRequestSession, unauthorized } from "../../../lib/server-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DeviceRow = {
  id: string;
  name: string;
  claimed_at: string | Date | null;
  last_seen_at: string | Date | null;
};

function serializeDevice(row: DeviceRow) {
  return {
    id: row.id,
    name: row.name,
    claimedAt: row.claimed_at instanceof Date
      ? row.claimed_at.toISOString()
      : row.claimed_at ? String(row.claimed_at) : null,
    lastSeenAt: row.last_seen_at instanceof Date
      ? row.last_seen_at.toISOString()
      : row.last_seen_at ? String(row.last_seen_at) : null,
  };
}

export async function GET(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const fridge = await getOrCreateDefaultFridge(session.user.id, session.user.name);
    const sql = getSql();
    const rows = await sql`
      SELECT id, name, claimed_at, last_seen_at
      FROM devices
      WHERE fridge_id = ${fridge.id}
      ORDER BY claimed_at ASC, id ASC
    ` as DeviceRow[];
    return Response.json({ fridge, devices: rows.map(serializeDevice) });
  } catch (error) {
    console.error("Device list failed", error);
    return Response.json({ error: "Could not load your displays." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const payload = await request.json() as { code?: unknown; deviceId?: unknown };
    const code = typeof payload.code === "string"
      ? normalizePairingCode(payload.code)
      : "";
    const deviceId = typeof payload.deviceId === "string"
      ? payload.deviceId.trim().toUpperCase()
      : "";

    if (code.length !== 8) {
      return Response.json(
        { error: "Enter the eight-character code shown on your display." },
        { status: 400 },
      );
    }

    const fridge = await getOrCreateDefaultFridge(session.user.id, session.user.name);
    const sql = getSql();
    const codeHash = hashPairingCode(code);
    const rows = deviceId
      ? await sql`
          UPDATE devices
          SET fridge_id = ${fridge.id},
              pairing_code_hash = NULL,
              pairing_code_expires_at = NULL,
              claimed_at = NOW()
          WHERE id = ${deviceId}
            AND fridge_id IS NULL
            AND pairing_code_hash = ${codeHash}
            AND pairing_code_expires_at > NOW()
          RETURNING id, name, claimed_at, last_seen_at
        ` as DeviceRow[]
      : await sql`
          UPDATE devices
          SET fridge_id = ${fridge.id},
              pairing_code_hash = NULL,
              pairing_code_expires_at = NULL,
              claimed_at = NOW()
          WHERE fridge_id IS NULL
            AND pairing_code_hash = ${codeHash}
            AND pairing_code_expires_at > NOW()
          RETURNING id, name, claimed_at, last_seen_at
        ` as DeviceRow[];

    if (!rows[0]) {
      return Response.json(
        { error: "That code is invalid or has expired. Wake the display and try the new code." },
        { status: 404 },
      );
    }

    return Response.json({ device: serializeDevice(rows[0]), fridge });
  } catch (error) {
    console.error("Device pairing failed", error);
    return Response.json({ error: "Could not pair this display." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const deviceId = new URL(request.url).searchParams.get("id")?.trim().toUpperCase();
    if (!deviceId) {
      return Response.json({ error: "A device ID is required." }, { status: 400 });
    }

    const fridge = await getOrCreateDefaultFridge(session.user.id, session.user.name);
    const sql = getSql();
    const rows = await sql`
      UPDATE devices
      SET fridge_id = NULL,
          pairing_code_hash = NULL,
          pairing_code_expires_at = NULL,
          claimed_at = NULL
      WHERE id = ${deviceId} AND fridge_id = ${fridge.id}
      RETURNING id
    `;
    if (!rows[0]) {
      return Response.json({ error: "That display is not connected." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Device unlink failed", error);
    return Response.json({ error: "Could not unlink this display." }, { status: 500 });
  }
}
