import { getSql } from "../../../db";
import { getOrCreateDefaultFridge } from "../../../db/fridges";
import { MAX_FRIDGE_NAME_LENGTH } from "../../../lib/fridge-name";
import { getRequestSession, unauthorized } from "../../../lib/server-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const payload = await request.json() as { name?: unknown };
    const name = typeof payload.name === "string" ? payload.name.trim() : "";

    if (!name || name.length > MAX_FRIDGE_NAME_LENGTH) {
      return Response.json(
        { error: `Enter a fridge name between 1 and ${MAX_FRIDGE_NAME_LENGTH} characters.` },
        { status: 400 },
      );
    }

    const fridge = await getOrCreateDefaultFridge(
      session.user.id,
      session.user.name,
    );
    const sql = getSql();
    const rows = await sql`
      UPDATE fridges
      SET name = ${name}
      WHERE id = ${fridge.id} AND owner_user_id = ${session.user.id}
      RETURNING id, name
    ` as Array<{ id: string; name: string }>;

    if (!rows[0]) {
      return Response.json({ error: "That fridge could not be found." }, { status: 404 });
    }
    return Response.json({ fridge: rows[0] });
  } catch (error) {
    console.error("Fridge rename failed", error);
    return Response.json({ error: "Could not rename your fridge." }, { status: 500 });
  }
}
