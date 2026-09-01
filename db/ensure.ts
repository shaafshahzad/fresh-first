import { env } from "cloudflare:workers";

let schemaReady: Promise<void> | null = null;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fridge_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          expires_on TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `),
      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_fridge_items_expiry_name
        ON fridge_items (expires_on, name)
      `),
    ]).then(() => undefined);
  }

  return schemaReady;
}
