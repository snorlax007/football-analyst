import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS pre_match_reports (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      home_team_id INT NOT NULL,
      away_team_id INT NOT NULL,
      home_team_name TEXT NOT NULL,
      away_team_name TEXT NOT NULL,
      report_md TEXT NOT NULL,
      match_date TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Gate behind Pro+
  const userRows = await sql`SELECT subscription_tier FROM users WHERE id = ${session.userId}`;
  const tier = (userRows[0]?.subscription_tier as string) ?? "free";
  if (tier === "free") {
    return NextResponse.json({ error: "Pre-match reports require Pro or Team plan.", upgradeUrl: "/pricing" }, { status: 403 });
  }

  const { homeTeamId, awayTeamId, matchDate } = await req.json() as {
    homeTeamId: number; awayTeamId: number; matchDate?: string;
  };

  if (!homeTeamId || !awayTeamId) {
    return NextResponse.json({ error: "homeTeamId and awayTeamId are required" }, { status: 400 });
  }

  await ensureTable();

  // Fetch last 5 matches per team with stats
  async function getTeamLastMatches(teamId: number) {
    return sql`
      SELECT
        m.id, m.match_date, m.home_score, m.away_score, m.league,
        ht.name AS home_name, at.name AS away_name,
        ms.possession, ms.xg, ms.shots, ms.shots_on_target, ms.pass_accuracy,
        ms.press_intensity, ms.fouls, ms.corners
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN match_stats ms ON ms.match_id = m.id AND ms.team_id = ${teamId}
      WHERE (m.home_team_id = ${teamId} OR m.away_team_id = ${teamId})
        AND m.status = 'finished'
      ORDER BY m.match_date DESC
      LIMIT 5
    `;
  }

  const [homeTeamRows, awayTeamRows, homeMatches, awayMatches] = await Promise.all([
    sql`SELECT name FROM teams WHERE id = ${homeTeamId}`,
    sql`SELECT name FROM teams WHERE id = ${awayTeamId}`,
    getTeamLastMatches(homeTeamId),
    getTeamLastMatches(awayTeamId),
  ]);

  if (homeTeamRows.length === 0 || awayTeamRows.length === 0) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const homeName = String(homeTeamRows[0].name);
  const awayName = String(awayTeamRows[0].name);

  function formatMatches(matches: typeof homeMatches, teamName: string) {
    if (matches.length === 0) return "No recent match data available.";
    return matches.map((m) => {
      const side = m.home_name === teamName ? "home" : "away";
      const gf = side === "home" ? m.home_score : m.away_score;
      const ga = side === "home" ? m.away_score : m.home_score;
      const result = Number(gf) > Number(ga) ? "W" : Number(gf) < Number(ga) ? "L" : "D";
      const opp = side === "home" ? m.away_name : m.home_name;
      const statsStr = m.xg
        ? ` | xG ${m.xg}, poss ${m.possession}%, press ${m.press_intensity}%`
        : "";
      return `${result} ${gf}-${ga} vs ${opp}${statsStr}`;
    }).join("\n");
  }

  let reportMd = "";

  if (!process.env.ANTHROPIC_API_KEY) {
    reportMd = `# Pre-Match Report: ${homeName} vs ${awayName}\n\n*AI analysis unavailable — ANTHROPIC_API_KEY not set.*\n\n## ${homeName} — Last 5\n${formatMatches(homeMatches, homeName)}\n\n## ${awayName} — Last 5\n${formatMatches(awayMatches, awayName)}`;
  } else {
    const client = new Anthropic();
    const prompt = `You are an elite football analyst. Generate a concise pre-match tactical brief for coaching staff.

**Fixture:** ${homeName} vs ${awayName}${matchDate ? ` on ${matchDate}` : ""}

**${homeName} — Last 5 results:**
${formatMatches(homeMatches, homeName)}

**${awayName} — Last 5 results:**
${formatMatches(awayMatches, awayName)}

Write a professional pre-match report in markdown with these sections:
1. **Form Summary** — 2-3 sentences on each team's recent form and confidence level
2. **Tactical Profile** — key patterns: pressing style, defensive shape, attack width
3. **Key Match-Ups** — 2 specific positional battles that will decide the game
4. **Set Pieces** — any patterns from the data, or general observations
5. **Prediction** — expected score and brief reasoning (1-2 sentences)

Keep it under 400 words. Be specific and data-driven.`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });
    reportMd = (msg.content[0] as { text: string }).text;
  }

  const inserted = await sql`
    INSERT INTO pre_match_reports (user_id, home_team_id, away_team_id, home_team_name, away_team_name, report_md, match_date)
    VALUES (${session.userId}, ${homeTeamId}, ${awayTeamId}, ${homeName}, ${awayName}, ${reportMd}, ${matchDate ?? null})
    RETURNING id
  `;

  return NextResponse.json({ ok: true, reportId: inserted[0].id, reportMd, homeName, awayName });
}

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  await ensureTable();

  const reports = await sql`
    SELECT id, home_team_name, away_team_name, match_date, created_at
    FROM pre_match_reports
    WHERE user_id = ${session.userId}
    ORDER BY created_at DESC
    LIMIT 20
  `;

  return NextResponse.json({ reports });
}
