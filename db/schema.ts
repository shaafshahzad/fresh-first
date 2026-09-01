import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const fridgeItems = sqliteTable(
  "fridge_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    expiresOn: text("expires_on").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_fridge_items_expiry_name").on(table.expiresOn, table.name),
  ],
);

export type FridgeItem = typeof fridgeItems.$inferSelect;
