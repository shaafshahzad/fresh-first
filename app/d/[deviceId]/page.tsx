import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSql } from "../../../db";
import { auth } from "../../../lib/auth";

export default async function DeviceNfcPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId: rawDeviceId } = await params;
  const deviceId = rawDeviceId.trim().toUpperCase();
  const returnPath = `/d/${encodeURIComponent(deviceId)}`;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(`/account?next=${encodeURIComponent(returnPath)}&device=${encodeURIComponent(deviceId)}`);
  }

  const sql = getSql();
  const rows = await sql`
    SELECT d.id, d.name, d.fridge_id, f.owner_user_id
    FROM devices d
    LEFT JOIN fridges f ON f.id = d.fridge_id
    WHERE d.id = ${deviceId}
    LIMIT 1
  ` as Array<{
    id: string;
    name: string;
    fridge_id: string | null;
    owner_user_id: string | null;
  }>;
  const device = rows[0];

  if (device && !device.fridge_id) {
    redirect(`/account?device=${encodeURIComponent(deviceId)}`);
  }
  if (device?.owner_user_id === session.user.id) {
    redirect(`/?device=${encodeURIComponent(deviceId)}#quick-add`);
  }

  return (
    <main className="device-gate" id="main-content">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">F</span>
        <span>Fresh First</span>
      </Link>
      <section>
        <p className="eyebrow">Display {deviceId}</p>
        <h1>{device ? "This display belongs to another account." : "We couldn’t find this display."}</h1>
        <p>
          {device
            ? "Sign in with the account that paired it, or unlink it from that account before pairing again."
            : "Check that the full NFC link was programmed into the tag."}
        </p>
        <Link className="auth-submit inline" href="/account">Open account <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
