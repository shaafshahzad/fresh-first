import { randomUUID } from "node:crypto";
import { getSql } from "./index";
import {
  normalizeDisplayHeader,
  type DisplayHeaderSettings,
} from "../lib/display-widgets";
import { defaultFridgeName } from "../lib/fridge-name";

export type Fridge = {
  id: string;
  name: string;
  displayHeader: DisplayHeaderSettings;
};

type FridgeRow = {
  id: string;
  name: string;
  header_left_widget: string;
  header_right_widget: string;
};

function toFridge(row: FridgeRow): Fridge {
  return {
    id: row.id,
    name: row.name,
    displayHeader: normalizeDisplayHeader(
      row.header_left_widget,
      row.header_right_widget,
    ),
  };
}

export async function getOrCreateDefaultFridge(
  userId: string,
  userName?: string | null,
): Promise<Fridge> {
  const sql = getSql();
  const existing = await sql`
    SELECT id, name, header_left_widget, header_right_widget
    FROM fridges
    WHERE owner_user_id = ${userId}
    ORDER BY created_at ASC
    LIMIT 1
  ` as FridgeRow[];
  if (existing[0]) return toFridge(existing[0]);

  const id = randomUUID();
  const name = defaultFridgeName(userName);
  const created = await sql`
    INSERT INTO fridges (id, owner_user_id, name)
    VALUES (${id}, ${userId}, ${name})
    ON CONFLICT (owner_user_id, name)
    DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name, header_left_widget, header_right_widget
  ` as FridgeRow[];
  return toFridge(created[0]);
}

export async function getOwnedFridge(userId: string, fridgeId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, header_left_widget, header_right_widget
    FROM fridges
    WHERE id = ${fridgeId} AND owner_user_id = ${userId}
    LIMIT 1
  ` as FridgeRow[];
  return rows[0] ? toFridge(rows[0]) : null;
}
