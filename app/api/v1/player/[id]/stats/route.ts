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
  const playerId = parseInt(id);
  if (isNaN(playerId)) return NextResponse.json({ error: "Invalid player id" }, { status: 400 });

  const [playerRows, statsRows, matchHistory] = await Promise.all([
    sql`
      SELECT p.id, p.name, p.position, p.age, t.name AS team_name, t.id AS team_id
      FROM players p JOIN teams t ON p.team_id = t.id
      WHERE p.id = ${playerId}
    `,
    sql`
      SELECT
        COUNT(pr.id)::int AS matches_played,
        ROUND(AVG(pr.rating)::numeric, 2) AS avg_rating,
        SUM(pr.goals)::int AS goals,
        SUM(pr.assists)::int AS assists,
        SUM(pr.shots)::int AS shots,
        SUM(pr.minutes_played)::int AS minutes_played,
        ROUND(AVG(pr.pass_accuracy)::numeric, 1) AS avg_pass_accuracy,
        ROUND(AVG(pr.tackles)::numeric, 1) AS avg_tackles,
        MAX(pr.rating) AS peak_rating
      FROM player_ratings pr WHERE pr.player_id = ${playerId}
    `,
    sql`
      SELECT
        m.id AS match_id, m.match_date, m.league,
        ht.name AS home_name, at.name AS away_name,
        m.home_score, m.away_score,
        pr.rating, pr.goals, pr.assists, pr.minutes_played
      FROM player_ratings pr
      JOIN matches m ON pr.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE pr.player_id = ${playerId}
      ORDER BY m.match_date DESC
      LIMIT 10
    `,
  ]);

  if (playerRows.length === 0) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const p = playerRows[0];
  const s = statsRows[0] ?? {};

  // FPL-compatible score: goals×6 + assists×3 + minutes/90×2 + avg_rating×1.5
  const fplScore = s.matches_played
    ? Math.round(
        Number(s.goals) * 6 +
        Number(s.assists) * 3 +
        (Number(s.minutes_played) / 90) * 2 +
        Number(s.avg_rating) * 1.5
      )
    : 0;

  return NextResponse.json({
    object: "player_stats",
    id: playerId,
    player: {
      name: p.name,
      position: p.position,
      age: p.age,
      team: p.team_name,
    },
    season_stats: {
      matches_played: s.matches_played ?? 0,
      avg_rating: s.avg_rating ?? null,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      shots: s.shots ?? 0,
      minutes_played: s.minutes_played ?? 0,
      avg_pass_accuracy: s.avg_pass_accuracy ?? null,
      avg_tackles: s.avg_tackles ?? null,
      peak_rating: s.peak_rating ? Number(s.peak_rating) : null,
    },
    fantasy: {
      fpl_score_estimate: fplScore,
      fpl_rating_scale: s.avg_rating ? Math.round(Number(s.avg_rating) * 10) : null,
    },
    recent_matches: matchHistory.map((mh) => ({
      match_id: mh.match_id,
      date: mh.match_date,
      fixture: `${mh.home_name} ${mh.home_score}–${mh.away_score} ${mh.away_name}`,
      league: mh.league,
      rating: Number(mh.rating),
      goals: mh.goals,
      assists: mh.assists,
      minutes: mh.minutes_played,
    })),
    _meta: { api_version: "v1" },
  });
}
