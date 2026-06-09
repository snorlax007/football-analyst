import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teamId = parseInt(id);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });

  const [teamRows, matchTrend, leagueAvg] = await Promise.all([
    sql`SELECT name FROM teams WHERE id = ${teamId}`,

    // Per-match trend data for this team
    sql`
      SELECT
        m.id AS match_id,
        m.match_date,
        m.home_score, m.away_score,
        m.home_team_id,
        ht.name AS home_name, at.name AS away_name,
        ms.possession, ms.xg, ms.press_intensity,
        ms.pass_accuracy, ms.shots, ms.shots_on_target
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN match_stats ms ON ms.match_id = m.id AND ms.team_id = ${teamId}
      WHERE (m.home_team_id = ${teamId} OR m.away_team_id = ${teamId})
        AND m.status = 'finished'
      ORDER BY m.match_date ASC
      LIMIT 20
    `,

    // League-wide averages for benchmarking
    sql`
      SELECT
        ROUND(AVG(possession)::numeric, 1) AS avg_possession,
        ROUND(AVG(xg)::numeric, 2)         AS avg_xg,
        ROUND(AVG(press_intensity)::numeric, 1) AS avg_press,
        ROUND(AVG(pass_accuracy)::numeric, 1)   AS avg_pass_acc,
        ROUND(AVG(shots)::numeric, 1)           AS avg_shots
      FROM match_stats
    `,
  ]);

  if (teamRows.length === 0) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const teamName = String(teamRows[0].name);
  const league = leagueAvg[0] ?? {};

  // Build trend points with result labels
  const trendPoints = matchTrend.map((m) => {
    const isHome = m.home_team_id === teamId;
    const gf = Number(isHome ? m.home_score : m.away_score);
    const ga = Number(isHome ? m.away_score : m.home_score);
    const result = gf > ga ? "W" : gf < ga ? "L" : "D";
    const opp = isHome ? m.away_name : m.home_name;
    return {
      matchId: m.match_id,
      date: m.match_date,
      opponent: opp,
      result,
      gf, ga,
      possession:    m.possession   ? Number(m.possession)   : null,
      xg:            m.xg           ? Number(m.xg)           : null,
      pressIntensity: m.press_intensity ? Number(m.press_intensity) : null,
      passAccuracy:  m.pass_accuracy ? Number(m.pass_accuracy) : null,
      shots:         m.shots        ? Number(m.shots)        : null,
    };
  });

  // Team averages for benchmark comparison
  const withStats = trendPoints.filter((p) => p.xg !== null);
  function avg(arr: (number | null)[]) {
    const nums = arr.filter((n): n is number => n !== null);
    return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
  }

  const teamAvg = {
    possession: avg(withStats.map((p) => p.possession)),
    xg: avg(withStats.map((p) => p.xg)),
    pressIntensity: avg(withStats.map((p) => p.pressIntensity)),
    passAccuracy: avg(withStats.map((p) => p.passAccuracy)),
    shots: avg(withStats.map((p) => p.shots)),
  };

  // Claude trend narrative
  let narrative = "";
  if (process.env.ANTHROPIC_API_KEY && trendPoints.length >= 2) {
    try {
      const client = new Anthropic();
      const results = trendPoints.map((p) => `${p.result} ${p.gf}-${p.ga} vs ${p.opponent}${p.xg !== null ? ` (xG ${p.xg})` : ""}`).join(", ");
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Football analyst: in 2-3 sentences, describe ${teamName}'s season trend based on these results in chronological order: ${results}. Note any patterns (winning/losing streaks, xG trends, drop in form). Be specific.`,
        }],
      });
      narrative = (msg.content[0] as { text: string }).text;
    } catch {
      narrative = "";
    }
  }

  return NextResponse.json({
    teamId, teamName,
    trendPoints,
    teamAvg,
    leagueAvg: {
      possession:    league.avg_possession ? Number(league.avg_possession) : null,
      xg:            league.avg_xg         ? Number(league.avg_xg)         : null,
      pressIntensity: league.avg_press     ? Number(league.avg_press)      : null,
      passAccuracy:  league.avg_pass_acc   ? Number(league.avg_pass_acc)   : null,
      shots:         league.avg_shots      ? Number(league.avg_shots)      : null,
    },
    narrative,
  });
}
