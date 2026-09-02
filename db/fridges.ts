import { randomUUID } from "node:crypto";
import { getSql } from "./index";

export type Fridge = {
  id: string;
  name: string;
};

type FridgeRow = {
  id: string;
  name: string;
};

export async function getOrCreateDefaultFridge(userId: string): Promise<Fridge> {
  const sql = getSql();
  const existing = await sql`
    SELECT id, name
    FROM fridges
    WHERE owner_user_id = ${userId}
    ORDER BY created_at ASC
    LIMIT 1
  ` as FridgeRow[];
  if (existing[0]) return existing[0];

  const id = randomUUID();
  const created = await sql`
    INSERT INTO fridges (id, owner_user_id, name)
    VALUES (${id}, ${userId}, 'My fridge')
    ON CONFLICT (owner_user_id, name)
    DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name
  ` as FridgeRow[];
  return created[0];
}

export async function getOwnedFridge(userId: string, fridgeId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name
    FROM fridges
    WHERE id = ${fridgeId} AND owner_user_id = ${userId}
    LIMIT 1
  ` as FridgeRow[];
  return rows[0] ?? null;
}
