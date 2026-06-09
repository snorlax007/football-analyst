import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teamId = parseInt(id);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });

  const teams = await sql`SELECT * FROM teams WHERE id = ${teamId}`;
  if (teams.length === 0) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  return NextResponse.json({ team: teams[0] });
}
