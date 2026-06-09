import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserOrgs } from "@/lib/orgs";
import sql from "@/lib/db";
import { ensureWebhooksTable } from "@/lib/webhooks";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = [
  "match.analysis.completed",
  "match.live.event",
  "pre_match.report.generated",
];

async function getOrgForUser(userId: string): Promise<number | null> {
  const orgs = await getUserOrgs(userId);
  const owned = orgs.find((o) => o.role === "owner");
  return owned ? Number(owned.id) : null;
}

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const orgId = await getOrgForUser(session.userId);
  if (!orgId) return NextResponse.json({ error: "No organization found. Create one first." }, { status: 403 });

  await ensureWebhooksTable();

  const hooks = await sql`
    SELECT id, url, events, active, last_fired, created_at
    FROM webhooks WHERE org_id = ${orgId} ORDER BY created_at DESC
  `;

  return NextResponse.json({ webhooks: hooks });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Gate: Team plan owners only
  const userRows = await sql`SELECT subscription_tier FROM users WHERE id = ${session.userId}`;
  const tier = (userRows[0]?.subscription_tier as string) ?? "free";
  if (tier !== "team") {
    return NextResponse.json({ error: "Webhooks require Team plan.", upgradeUrl: "/pricing" }, { status: 403 });
  }

  const orgId = await getOrgForUser(session.userId);
  if (!orgId) return NextResponse.json({ error: "You must be an org owner to configure webhooks." }, { status: 403 });

  const body = await req.json() as { url?: string; events?: string[] };
  const url = body.url?.trim();
  if (!url || !url.startsWith("https://")) {
    return NextResponse.json({ error: "A valid HTTPS URL is required." }, { status: 400 });
  }

  const events = (body.events ?? ALLOWED_EVENTS).filter((e) => ALLOWED_EVENTS.includes(e));
  if (events.length === 0) {
    return NextResponse.json({ error: "Select at least one event." }, { status: 400 });
  }

  // Max 3 webhooks per org
  await ensureWebhooksTable();
  const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM webhooks WHERE org_id = ${orgId} AND active = TRUE`;
  if (Number(countRows[0].cnt) >= 3) {
    return NextResponse.json({ error: "Maximum 3 active webhooks per org." }, { status: 400 });
  }

  const secret = "whsec_fa_" + randomBytes(20).toString("hex");
  const inserted = await sql`
    INSERT INTO webhooks (org_id, url, events, secret)
    VALUES (${orgId}, ${url}, ${events}, ${secret})
    RETURNING id, url, events, active, created_at
  `;

  return NextResponse.json({ ok: true, webhook: inserted[0], secret });
}
