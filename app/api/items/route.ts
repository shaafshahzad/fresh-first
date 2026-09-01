import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureSchema } from "../../../db/ensure";
import { fridgeItems } from "../../../db/schema";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function publicError(error: unknown) {
  console.error("Fridge item request failed", error);
  return Response.json(
    { error: "Fresh First could not update the fridge. Please try again." },
    { status: 500 },
  );
}

export async function GET() {
  try {
    await ensureSchema();
    const db = getDb();
    const items = await db
      .select()
      .from(fridgeItems)
      .orderBy(
        asc(fridgeItems.expiresOn),
        asc(fridgeItems.name),
        asc(fridgeItems.id),
      );

    return Response.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return publicError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: unknown;
      expiresOn?: unknown;
    };
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const expiresOn =
      typeof payload.expiresOn === "string" ? payload.expiresOn : "";

    if (!name || name.length > 80) {
      return Response.json(
        { error: "Enter a product name between 1 and 80 characters." },
        { status: 400 },
      );
    }

    if (!isValidDate(expiresOn)) {
      return Response.json(
        { error: "Choose a valid expiry date." },
        { status: 400 },
      );
    }

    await ensureSchema();
    const db = getDb();
    const [item] = await db
      .insert(fridgeItems)
      .values({ name, expiresOn })
      .returning();

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return publicError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isSafeInteger(id) || id < 1) {
      return Response.json({ error: "A valid item id is required." }, { status: 400 });
    }

    await ensureSchema();
    const db = getDb();
    const [item] = await db
      .delete(fridgeItems)
      .where(eq(fridgeItems.id, id))
      .returning();

    if (!item) {
      return Response.json({ error: "That item no longer exists." }, { status: 404 });
    }

    return Response.json({ item });
  } catch (error) {
    return publicError(error);
  }
}
