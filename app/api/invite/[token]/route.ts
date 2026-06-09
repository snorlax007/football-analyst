import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rows = await sql`
    SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at,
           o.name AS org_name, o.slug AS org_slug
    FROM org_invitations i
    JOIN organizations o ON i.org_id = o.id
    WHERE i.token = ${token}
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  const inv = rows[0];
  if (inv.accepted_at) return NextResponse.json({ error: "Invitation already accepted" }, { status: 410 });
  if (new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: "Invitation expired" }, { status: 410 });

  return NextResponse.json({
    orgName: inv.org_name,
    orgSlug: inv.org_slug,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expires_at,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { token } = await params;
  const rows = await sql`
    SELECT i.*, o.slug AS org_slug
    FROM org_invitations i
    JOIN organizations o ON i.org_id = o.id
    WHERE i.token = ${token}
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  const inv = rows[0];
  if (inv.accepted_at) return NextResponse.json({ error: "Invitation already accepted" }, { status: 410 });
  if (new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: "Invitation expired" }, { status: 410 });

  const existing = await sql`
    SELECT id FROM org_members WHERE org_id = ${inv.org_id} AND user_id = ${session.userId}
  `;
  if (existing.length === 0) {
    await sql`
      INSERT INTO org_members (org_id, user_id, role)
      VALUES (${inv.org_id}, ${session.userId}, ${inv.role})
    `;
  }

  await sql`UPDATE org_invitations SET accepted_at = NOW() WHERE id = ${inv.id}`;

  return NextResponse.json({ ok: true, orgSlug: inv.org_slug });
}
