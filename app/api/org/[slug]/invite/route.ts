import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import { getOrgBySlug, getUserRoleInOrg } from "@/lib/orgs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const role = await getUserRoleInOrg(session.userId, org.id);
  if (role !== "owner") return NextResponse.json({ error: "Only org owners can invite members" }, { status: 403 });

  const { email, role: inviteRole = "analyst" } = await req.json();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!["analyst", "viewer"].includes(inviteRole)) {
    return NextResponse.json({ error: "Role must be analyst or viewer" }, { status: 400 });
  }

  const existingMember = await sql`
    SELECT om.id FROM org_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.org_id = ${org.id} AND u.email = ${email}
  `;
  if (existingMember.length > 0) {
    return NextResponse.json({ error: "This person is already a member" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO org_invitations (id, org_id, email, role, invited_by, token, expires_at)
    VALUES (${id}, ${org.id}, ${email}, ${inviteRole}, ${session.userId}, ${token}, ${expiresAt})
  `;

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${token}`;

  return NextResponse.json({ ok: true, id, token, inviteUrl, email, role: inviteRole }, { status: 201 });
}
