import { NextRequest } from "next/server";
import { createHash } from "crypto";
import sql from "@/lib/db";

export interface ApiKeySession {
  keyId: number;
  userId: string;
  orgId: string | null;
  tier: "pro" | "team";
  keyName: string;
}

// Per-tier daily request limits
export const API_RATE_LIMITS: Record<string, number> = {
  pro: 100,
  team: 1000,
};

let tablesReady = false;
async function ensureTables() {
  if (tablesReady) return;
  tablesReady = true;
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id           SERIAL PRIMARY KEY,
      user_id      TEXT NOT NULL,
      org_id       TEXT REFERENCES organizations(id) ON DELETE SET NULL,
      key_hash     TEXT NOT NULL UNIQUE,
      key_prefix   TEXT NOT NULL,
      name         TEXT NOT NULL DEFAULT 'My API Key',
      tier         TEXT NOT NULL DEFAULT 'pro',
      revoked      BOOLEAN NOT NULL DEFAULT FALSE,
      last_used_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS api_usage (
      api_key_id INT  NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
      day        DATE NOT NULL DEFAULT CURRENT_DATE,
      count      INT  NOT NULL DEFAULT 0,
      PRIMARY KEY (api_key_id, day)
    )
  `;
}

export async function authenticateApiKey(req: NextRequest): Promise<ApiKeySession | null> {
  await ensureTables();

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token || !token.startsWith("faa_")) return null;

  const hash = createHash("sha256").update(token).digest("hex");

  const rows = await sql`
    SELECT id, user_id, org_id, tier, name, revoked FROM api_keys WHERE key_hash = ${hash}
  `;
  if (rows.length === 0 || rows[0].revoked) return null;

  const key = rows[0];

  // Check rate limit
  const limit = API_RATE_LIMITS[key.tier as string] ?? 100;
  const usageRows = await sql`
    INSERT INTO api_usage (api_key_id, day, count)
    VALUES (${key.id}, CURRENT_DATE, 1)
    ON CONFLICT (api_key_id, day) DO UPDATE SET count = api_usage.count + 1
    RETURNING count
  `;
  const count = Number(usageRows[0].count);
  if (count > limit) return null; // rate limited — caller returns 429

  // Update last_used_at
  await sql`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${key.id}`;

  return {
    keyId: Number(key.id),
    userId: String(key.user_id),
    orgId: key.org_id ? String(key.org_id) : null,
    tier: key.tier as "pro" | "team",
    keyName: String(key.name),
  };
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = "faa_" + createHash("sha256").update(Math.random().toString() + Date.now()).digest("hex").slice(0, 32);
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 10);
  return { raw, hash, prefix };
}

export { ensureTables as ensureApiKeyTables };
