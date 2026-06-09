import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teamId = parseInt(id);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });

  const aggRows = await sql`
    SELECT
      COUNT(m.id)::int                                              AS played,
      SUM(CASE
        WHEN m.home_team_id = ${teamId} AND m.home_score > m.away_score THEN 1
        WHEN m.away_team_id = ${teamId} AND m.away_score > m.home_score THEN 1
        ELSE 0 END)::int                                            AS wins,
      SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END)::int AS draws,
      SUM(CASE
        WHEN m.home_team_id = ${teamId} AND m.home_score < m.away_score THEN 1
        WHEN m.away_team_id = ${teamId} AND m.away_score < m.home_score THEN 1
        ELSE 0 END)::int                                            AS losses,
      SUM(CASE WHEN m.home_team_id = ${teamId} THEN m.home_score ELSE m.away_score END)::int AS goals_for,
      SUM(CASE WHEN m.home_team_id = ${teamId} THEN m.away_score ELSE m.home_score END)::int AS goals_against
    FROM matches m
    WHERE (m.home_team_id = ${teamId} OR m.away_team_id = ${teamId})
      AND m.status = 'finished'
  `;

  const row = aggRows[0] ?? {};
  const stats = [
    { label: "Played", value: row.played ?? 0 },
    { label: "Wins",   value: row.wins ?? 0 },
    { label: "Draws",  value: row.draws ?? 0 },
    { label: "Losses", value: row.losses ?? 0 },
    { label: "GF",     value: row.goals_for ?? 0 },
    { label: "GA",     value: row.goals_against ?? 0 },
  ];

  return NextResponse.json({ stats });
}
