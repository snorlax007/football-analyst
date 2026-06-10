import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("x-admin-secret") === secret;
}

// GET /api/admin/env-check — returns which keys are set (values masked)
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = [
    "ANTHROPIC_API_KEY",
    "CRON_SECRET",
    "DATABASE_URL",
    "JWT_SECRET",
    "FOOTBALL_DATA_API_KEY",
    "API_FOOTBALL_KEY",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  ];

  const result: Record<string, { set: boolean; length: number | null }> = {};
  for (const k of keys) {
    const v = process.env[k];
    result[k] = { set: !!v, length: v ? v.length : null };
  }

  return NextResponse.json({ ok: true, env: result });
}
