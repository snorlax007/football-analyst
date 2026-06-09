import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import { generateApiKey, ensureApiKeyTables, API_RATE_LIMITS } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  await ensureApiKeyTables();

  const keys = await sql`
    SELECT id, key_prefix, name, tier, revoked, last_used_at, created_at,
           COALESCE(
             (SELECT count FROM api_usage WHERE api_key_id = api_keys.id AND day = CURRENT_DATE),
             0
           )::int AS requests_today
    FROM api_keys
    WHERE user_id = ${session.userId} AND revoked = FALSE
    ORDER BY created_at DESC
  `;

  return NextResponse.json({
    keys: keys.map((k) => ({
      ...k,
      dailyLimit: API_RATE_LIMITS[k.tier as string] ?? 100,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Only Pro+ can issue API keys
  const userRows = await sql`SELECT subscription_tier FROM users WHERE id = ${session.userId}`;
  const tier = (userRows[0]?.subscription_tier as string) ?? "free";
  if (tier === "free") {
    return NextResponse.json({ error: "API keys require Pro or Team plan.", upgradeUrl: "/pricing" }, { status: 403 });
  }

  await ensureApiKeyTables();

  // Max 5 keys per user
  const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM api_keys WHERE user_id = ${session.userId} AND revoked = FALSE`;
  if (Number(countRows[0].cnt) >= 5) {
    return NextResponse.json({ error: "Maximum 5 active API keys allowed. Revoke one first." }, { status: 400 });
  }

  const body = await req.json() as { name?: string };
  const name = (body.name ?? "My API Key").slice(0, 60);
  const { raw, hash, prefix } = generateApiKey();

  await sql`
    INSERT INTO api_keys (user_id, key_hash, key_prefix, name, tier)
    VALUES (${session.userId}, ${hash}, ${prefix}, ${name}, ${tier})
  `;

  // Return raw key once — never stored in DB
  return NextResponse.json({ ok: true, key: raw, prefix, name, tier });
}
