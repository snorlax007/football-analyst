import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import { toSlug, getUniqueSlug } from "@/lib/orgs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Organization name is required" }, { status: 400 });

  const base = toSlug(name.trim());
  if (!base) return NextResponse.json({ error: "Invalid organization name" }, { status: 400 });

  const slug = await getUniqueSlug(base);
  const id = crypto.randomUUID();

  await sql`
    INSERT INTO organizations (id, name, slug, owner_id)
    VALUES (${id}, ${name.trim()}, ${slug}, ${session.userId})
  `;
  await sql`
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (${id}, ${session.userId}, 'owner')
  `;

  return NextResponse.json({ ok: true, id, slug, name: name.trim() }, { status: 201 });
}
