import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserOrgs } from "@/lib/orgs";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const orgs = await getUserOrgs(session.userId);
  const orgIds = orgs.filter((o) => o.role === "owner").map((o) => Number(o.id));
  if (orgIds.length === 0) return NextResponse.json({ error: "No org ownership" }, { status: 403 });

  const { id } = await params;
  const hookId = parseInt(id);
  if (isNaN(hookId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await sql`UPDATE webhooks SET active = FALSE WHERE id = ${hookId} AND org_id = ANY(${orgIds})`;
  return NextResponse.json({ ok: true });
}
