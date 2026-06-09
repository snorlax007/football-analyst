import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import { getOrgBySlug, getUserRoleInOrg } from "@/lib/orgs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { slug, id } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const role = await getUserRoleInOrg(session.userId, org.id);
  if (role !== "owner") return NextResponse.json({ error: "Only owners can revoke invitations" }, { status: 403 });

  await sql`DELETE FROM org_invitations WHERE id = ${id} AND org_id = ${org.id}`;

  return NextResponse.json({ ok: true });
}
