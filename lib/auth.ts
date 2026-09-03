import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

const globalForAuth = globalThis as typeof globalThis & {
  freshFirstAuthPool?: Pool;
};

const pool = globalForAuth.freshFirstAuthPool ?? new Pool({
  connectionString: databaseUrl,
  max: 5,
});

if (process.env.NODE_ENV !== "production") {
  globalForAuth.freshFirstAuthPool = pool;
}

export const auth = betterAuth({
  appName: "Fresh First",
  baseURL: process.env.BETTER_AUTH_URL ?? {
    allowedHosts: [
      "localhost:3000",
      "127.0.0.1:3000",
      "192.168.*.*:3000",
      "fresh-first.vercel.app",
      "*.vercel.app",
    ],
    fallback: "http://localhost:3000",
  },
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  trustedOrigins: (request) => {
    const origins = new Set<string>([
      "http://localhost:3000",
      "https://localhost:3000",
      "https://fresh-first.vercel.app",
      "https://*.vercel.app",
    ]);
    if (process.env.BETTER_AUTH_URL) origins.add(process.env.BETTER_AUTH_URL);
    if (request && process.env.NODE_ENV !== "production") {
      origins.add(new URL(request.url).origin);
    }
    return [...origins];
  },
});

export type FreshFirstSession = typeof auth.$Infer.Session;
