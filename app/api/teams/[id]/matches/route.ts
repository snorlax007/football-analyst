import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teamId = parseInt(id);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });

  const matches = await sql`
    SELECT
      m.id, m.home_score, m.away_score, m.status,
      m.match_date, m.league, m.home_team_id,
      ht.name AS home_name, at.name AS away_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.home_team_id = ${teamId} OR m.away_team_id = ${teamId}
    ORDER BY m.match_date DESC
    LIMIT 20
  `;

  return NextResponse.json({ matches });
}
