import { getSql } from "../../../db";
import { getOrCreateDefaultFridge } from "../../../db/fridges";
import {
  type FridgeItem,
  type FridgeItemRow,
  toFridgeItem,
} from "../../../db/schema";
import { getRequestSession, unauthorized } from "../../../lib/server-session";
import { resolveDisplayHeader } from "../../../lib/display-widgets";
import { expiryPresentation } from "../../../lib/expiry-urgency";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BATCH_SIZE = 25;

type ItemInput = {
  name?: unknown;
  expiresOn?: unknown;
};

function isValidDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function validateItem(input: ItemInput) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const expiresOn =
    typeof input.expiresOn === "string" ? input.expiresOn : "";

  if (!name || name.length > 80) {
    throw new Error("Enter a product name between 1 and 80 characters.");
  }
  if (!isValidDate(expiresOn)) {
    throw new Error("Choose a valid expiry date.");
  }

  return { name, expiresOn };
}

function publicError(error: unknown) {
  console.error("Fridge item request failed", error);
  return Response.json(
    { error: "Fresh First could not update the fridge. Please try again." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const fridge = await getOrCreateDefaultFridge(session.user.id, session.user.name);
    const sql = getSql();
    const rows = (await sql`
      SELECT id, name, expires_on, created_at
      FROM fridge_items
      WHERE status = 'active' AND fridge_id = ${fridge.id}
      ORDER BY expires_on ASC, LOWER(name) ASC, id ASC
    `) as FridgeItemRow[];

    const items = rows.map(toFridgeItem);
    const attentionCount = items.filter((item) => {
      const days = expiryPresentation(item.expiresOn).days;
      return days !== null && days <= 5;
    }).length;
    const header = resolveDisplayHeader(fridge.displayHeader, {
      fridgeName: fridge.name,
      nextItemName: items[0]?.name ?? null,
      itemCount: items.length,
      attentionCount,
    });

    return Response.json(
      { items, fridge: { id: fridge.id, name: fridge.name }, header },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return publicError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const fridge = await getOrCreateDefaultFridge(session.user.id, session.user.name);
    const payload = (await request.json()) as ItemInput & {
      items?: ItemInput[];
    };
    const inputs = Array.isArray(payload.items) ? payload.items : [payload];

    if (inputs.length === 0 || inputs.length > MAX_BATCH_SIZE) {
      return Response.json(
        { error: `Add between 1 and ${MAX_BATCH_SIZE} items at a time.` },
        { status: 400 },
      );
    }

    let validated: Array<{ name: string; expiresOn: string }>;
    try {
      validated = inputs.map(validateItem);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid item." },
        { status: 400 },
      );
    }

    const sql = getSql();
    const items: FridgeItem[] = [];
    for (const input of validated) {
      const rows = (await sql`
        INSERT INTO fridge_items (name, expires_on, fridge_id)
        VALUES (${input.name}, ${input.expiresOn}, ${fridge.id})
        RETURNING id, name, expires_on, created_at
      `) as FridgeItemRow[];
      items.push(toFridgeItem(rows[0]));
    }

    return Response.json(
      { item: items[0], items },
      { status: 201 },
    );
  } catch (error) {
    return publicError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const fridge = await getOrCreateDefaultFridge(session.user.id, session.user.name);
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isSafeInteger(id) || id < 1) {
      return Response.json(
        { error: "A valid item id is required." },
        { status: 400 },
      );
    }

    let input: { name: string; expiresOn: string };
    try {
      input = validateItem(await request.json() as ItemInput);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid item." },
        { status: 400 },
      );
    }

    const sql = getSql();
    const rows = (await sql`
      UPDATE fridge_items
      SET name = ${input.name}, expires_on = ${input.expiresOn}
      WHERE id = ${id} AND fridge_id = ${fridge.id} AND status = 'active'
      RETURNING id, name, expires_on, created_at
    `) as FridgeItemRow[];

    if (rows.length === 0) {
      return Response.json(
        { error: "That item no longer exists." },
        { status: 404 },
      );
    }

    return Response.json({ item: toFridgeItem(rows[0]) });
  } catch (error) {
    return publicError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const fridge = await getOrCreateDefaultFridge(session.user.id, session.user.name);
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isSafeInteger(id) || id < 1) {
      return Response.json(
        { error: "A valid item id is required." },
        { status: 400 },
      );
    }

    const sql = getSql();
    const rows = (await sql`
      UPDATE fridge_items
      SET status = 'used', removed_at = NOW()
      WHERE id = ${id} AND fridge_id = ${fridge.id} AND status = 'active'
      RETURNING id, name, expires_on, created_at
    `) as FridgeItemRow[];

    if (rows.length === 0) {
      return Response.json(
        { error: "That item no longer exists." },
        { status: 404 },
      );
    }

    return Response.json({ item: toFridgeItem(rows[0]) });
  } catch (error) {
    return publicError(error);
  }
}
