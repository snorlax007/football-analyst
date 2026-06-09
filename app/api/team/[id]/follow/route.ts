import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const teamId = parseInt(id);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });

  const teams = await sql`SELECT id FROM teams WHERE id = ${teamId}`;
  if (teams.length === 0) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await sql`
    INSERT INTO followed_teams (user_id, team_id)
    VALUES (${session.userId}, ${teamId})
    ON CONFLICT (user_id, team_id) DO NOTHING
  `;

  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const teamId = parseInt(id);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });

  await sql`
    DELETE FROM followed_teams WHERE user_id = ${session.userId} AND team_id = ${teamId}
  `;

  return NextResponse.json({ ok: true, following: false });
}
