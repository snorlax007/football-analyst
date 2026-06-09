import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { authenticateApiKey } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const keySession = await authenticateApiKey(req);
  if (!keySession) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer API key.", docs: "/docs" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer realm=\"Football AI API\"" } }
    );
  }

  const { id } = await params;
  const matchId = parseInt(id);
  if (isNaN(matchId)) return NextResponse.json({ error: "Invalid match id" }, { status: 400 });

  const [matchRows, statsRows, analysisRows, playerRows] = await Promise.all([
    sql`
      SELECT m.id, m.home_score, m.away_score, m.status, m.match_date, m.league, m.season, m.venue,
             ht.name AS home_name, ht.short_name AS home_short,
             at.name AS away_name, at.short_name AS away_short
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${matchId}
    `,
    sql`
      SELECT t.name AS team_name, ms.possession, ms.xg, ms.shots, ms.shots_on_target,
             ms.pass_accuracy, ms.press_intensity, ms.fouls, ms.corners
      FROM match_stats ms JOIN teams t ON ms.team_id = t.id
      WHERE ms.match_id = ${matchId}
    `,
    sql`
      SELECT insights, model, created_at FROM ai_analyses
      WHERE match_id = ${matchId} ORDER BY created_at DESC LIMIT 1
    `,
    sql`
      SELECT p.name, p.position, t.name AS team_name,
             pr.rating, pr.goals, pr.assists, pr.minutes_played
      FROM player_ratings pr
      JOIN players p ON pr.player_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE pr.match_id = ${matchId}
      ORDER BY pr.rating DESC LIMIT 11
    `,
  ]);

  if (matchRows.length === 0) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const m = matchRows[0];

  return NextResponse.json({
    object: "match_analysis",
    id: matchId,
    match: {
      home_team: m.home_name,
      away_team: m.away_name,
      score: { home: m.home_score, away: m.away_score },
      status: m.status,
      date: m.match_date,
      league: m.league,
      season: m.season,
      venue: m.venue,
    },
    stats: statsRows.map((s) => ({
      team: s.team_name,
      possession: s.possession,
      xg: s.xg,
      shots: s.shots,
      shots_on_target: s.shots_on_target,
      pass_accuracy: s.pass_accuracy,
      press_intensity: s.press_intensity,
      fouls: s.fouls,
      corners: s.corners,
    })),
    analysis: analysisRows.length > 0
      ? { insights: analysisRows[0].insights, model: analysisRows[0].model, generated_at: analysisRows[0].created_at }
      : null,
    top_players: playerRows.map((p) => ({
      name: p.name,
      position: p.position,
      team: p.team_name,
      rating: Number(p.rating),
      goals: p.goals,
      assists: p.assists,
      minutes: p.minutes_played,
    })),
    _meta: { api_version: "v1" },
  });
}
