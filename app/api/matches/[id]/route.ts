import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/matches/[id]">
) {
  const { id } = await ctx.params;
  const matchId = parseInt(id);

  if (isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  const matches = await sql`
    SELECT
      m.id, m.home_score, m.away_score, m.status,
      m.match_date, m.league, m.season, m.venue,
      ht.id   AS home_team_id,   ht.name AS home_team_name,
      ht.short_name AS home_short, ht.logo_url AS home_logo,
      at.id   AS away_team_id,   at.name AS away_team_name,
      at.short_name AS away_short, at.logo_url AS away_logo
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.id = ${matchId}
  `;

  if (matches.length === 0) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const m = matches[0];

  const stats = await sql`
    SELECT ms.*, t.name AS team_name
    FROM match_stats ms
    JOIN teams t ON ms.team_id = t.id
    WHERE ms.match_id = ${matchId}
  `;

  const players = await sql`
    SELECT
      pr.id, pr.rating, pr.minutes_played, pr.goals,
      pr.assists, pr.shots, pr.passes, pr.pass_accuracy, pr.tackles,
      p.name, p.position,
      t.name AS team_name
    FROM player_ratings pr
    JOIN players p ON pr.player_id = p.id
    JOIN teams t ON p.team_id = t.id
    WHERE pr.match_id = ${matchId}
    ORDER BY pr.rating DESC
    LIMIT 8
  `;

  const analyses = await sql`
    SELECT insights, model, created_at
    FROM ai_analyses
    WHERE match_id = ${matchId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return NextResponse.json({
    id: m.id,
    home_team: { id: m.home_team_id, name: m.home_team_name, short_name: m.home_short, logo_url: m.home_logo },
    away_team: { id: m.away_team_id, name: m.away_team_name, short_name: m.away_short, logo_url: m.away_logo },
    home_score: m.home_score,
    away_score: m.away_score,
    status: m.status,
    match_date: m.match_date,
    league: m.league,
    season: m.season,
    venue: m.venue,
    home_stats: stats.find((s) => s.team_id === m.home_team_id) ?? null,
    away_stats: stats.find((s) => s.team_id === m.away_team_id) ?? null,
    players,
    analysis: analyses.length > 0 ? analyses[0] : null,
  });
}
