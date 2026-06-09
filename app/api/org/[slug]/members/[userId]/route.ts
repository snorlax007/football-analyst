import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import { getOrgBySlug, getUserRoleInOrg } from "@/lib/orgs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { slug, userId } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const myRole = await getUserRoleInOrg(session.userId, org.id);
  if (myRole !== "owner") return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 });

  if (userId === org.owner_id) {
    return NextResponse.json({ error: "Cannot remove the organization owner" }, { status: 400 });
  }

  await sql`DELETE FROM org_members WHERE org_id = ${org.id} AND user_id = ${userId}`;

  return NextResponse.json({ ok: true });
}
