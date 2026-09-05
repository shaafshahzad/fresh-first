import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

await sql`CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId")`;
await sql`CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId")`;
await sql`CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`;

await sql`
  CREATE TABLE IF NOT EXISTS fridges (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My fridge',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_user_id, name)
  )
`;

await sql`
  ALTER TABLE fridges
  ADD COLUMN IF NOT EXISTS header_left_widget TEXT NOT NULL DEFAULT 'brand'
`;

await sql`
  ALTER TABLE fridges
  ADD COLUMN IF NOT EXISTS header_right_widget TEXT NOT NULL DEFAULT 'fridge_name'
`;

await sql`
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Fridge display',
    fridge_id TEXT REFERENCES fridges (id) ON DELETE SET NULL,
    api_key_hash TEXT NOT NULL UNIQUE,
    pairing_code_hash TEXT,
    pairing_code_expires_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    firmware_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

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

await sql`
  ALTER TABLE fridge_items
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user'
`;

await sql`
  ALTER TABLE fridge_items
  ADD COLUMN IF NOT EXISTS fridge_id TEXT REFERENCES fridges (id) ON DELETE CASCADE
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_fridge_items_source
  ON fridge_items (source)
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_fridge_items_fridge_active_expiry
  ON fridge_items (fridge_id, status, expires_on, name)
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_devices_fridge
  ON devices (fridge_id)
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_devices_pairing_code
  ON devices (pairing_code_hash, pairing_code_expires_at)
`;

console.log("Fresh First database is ready.");
