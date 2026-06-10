import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function auth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("x-admin-secret") === secret;
}

async function analyzeMatch(matchId: number): Promise<string[]> {
  const [matchRows, statsRows] = await Promise.all([
    sql`
      SELECT m.home_score, m.away_score, m.league, m.competition, m.match_date,
             ht.name AS home_name, at.name AS away_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${matchId}
    `,
    sql`
      SELECT ms.*, t.name AS team_name
      FROM match_stats ms JOIN teams t ON ms.team_id = t.id
      WHERE ms.match_id = ${matchId}
    `,
  ]);

  if (!matchRows.length) throw new Error("Match not found");
  const m = matchRows[0];

  const hs = statsRows.find((s) => s.team_name === m.home_name);
  const as_ = statsRows.find((s) => s.team_name === m.away_name);

  const statsText = hs && as_
    ? `\n${String(m.home_name)}: Possession ${String(hs.possession)}% | xG ${String(hs.xg)} | Shots ${String(hs.shots)} (${String(hs.shots_on_target)} on target) | Pass accuracy ${String(hs.pass_accuracy)}% | Corners ${String(hs.corners)} | Fouls ${String(hs.fouls)}
${String(m.away_name)}: Possession ${String(as_.possession)}% | xG ${String(as_.xg)} | Shots ${String(as_.shots)} (${String(as_.shots_on_target)} on target) | Pass accuracy ${String(as_.pass_accuracy)}% | Corners ${String(as_.corners)} | Fouls ${String(as_.fouls)}`
    : "(No detailed stats available)";

  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const resp = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `You are an expert football analyst covering the FIFA World Cup 2026.
Analyse this match and provide 4 sharp tactical insights. Each insight must be one concise sentence (max 25 words). Return ONLY a JSON array of 4 strings.

Match: ${String(m.home_name)} ${String(m.home_score)}-${String(m.away_score)} ${String(m.away_name)}
Competition: ${String(m.competition ?? m.league ?? "International")}
Stats:${statsText}

Return format: ["insight 1","insight 2","insight 3","insight 4"]`,
    }],
  });

  const raw = resp.content[0].type === "text" ? resp.content[0].text.trim() : "[]";
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  return arrMatch ? (JSON.parse(arrMatch[0]) as string[]) : [];
}

// POST /api/admin/bulk-analyze
// Body: { days?: number (default 7), maxMatches?: number (default 10) }
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { days?: number; maxMatches?: number };
  const days       = body.days       ?? 7;
  const maxMatches = body.maxMatches ?? 10;

  // Find finished matches in the window that have no AI analysis yet
  const pending = await sql`
    SELECT m.id, ht.name AS home_name, at.name AS away_name,
           m.home_score, m.away_score, m.competition, m.league
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.status = 'finished'
      AND m.match_date >= NOW() - (${days} || ' days')::INTERVAL
      AND NOT EXISTS (
        SELECT 1 FROM ai_analyses aa WHERE aa.match_id = m.id
      )
    ORDER BY m.match_date DESC
    LIMIT ${maxMatches}
  `;

  if (pending.length === 0) {
    return NextResponse.json({
      ok: true,
      message: `No unanalyzed finished matches in the last ${days} days`,
      analyzed: 0,
    });
  }

  const analyzed: string[] = [];
  const failed:   string[] = [];

  for (const match of pending) {
    const label = `${String(match.home_name)} ${String(match.home_score)}-${String(match.away_score)} ${String(match.away_name)}`;
    try {
      const insights = await analyzeMatch(match.id as number);
      if (insights.length === 0) throw new Error("Empty insights");

      await sql`
        INSERT INTO ai_analyses (match_id, insights, model)
        VALUES (${match.id as number}, ${JSON.stringify(insights)}, ${"claude-haiku-4-5-20251001"})
        ON CONFLICT DO NOTHING
      `;
      analyzed.push(label);
    } catch (e) {
      failed.push(`${label}: ${(e as Error).message.slice(0, 50)}`);
    }

    // Rate-limit friendly delay
    await new Promise((r) => setTimeout(r, 1000));
  }

  return NextResponse.json({
    ok:       true,
    analyzed: analyzed.length,
    failed:   failed.length,
    matches:  analyzed,
    errors:   failed,
    total:    pending.length,
  });
}
