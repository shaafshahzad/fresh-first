import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS fridge_items (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    expires_on DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMPTZ
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_fridge_items_active_expiry_name
  ON fridge_items (status, expires_on, name)
`;

console.log("Fresh First database is ready.");
