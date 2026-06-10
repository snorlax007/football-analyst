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

interface MatchRow {
  home_name: unknown; away_name: unknown;
  home_score: unknown; away_score: unknown;
  competition: unknown; league: unknown;
}

interface StatsRow {
  team_name: unknown;
  possession: unknown; xg: unknown; shots: unknown;
  shots_on_target: unknown; pass_accuracy: unknown;
  corners: unknown; fouls: unknown;
}

function templateInsights(
  homeName: string, awayName: string,
  homeScore: number, awayScore: number,
  hs: StatsRow | undefined, as_: StatsRow | undefined,
): string[] {
  const winner = homeScore > awayScore ? homeName : awayScore > homeScore ? awayName : null;
  const loser  = homeScore > awayScore ? awayName : awayScore > homeScore ? homeName : null;
  const draw   = homeScore === awayScore;

  const homePoss = hs ? Number(hs.possession) : 50;
  const awayPoss = as_ ? Number(as_.possession) : 50;
  const homeXg   = hs ? Number(hs.xg) : homeScore * 0.9;
  const awayXg   = as_ ? Number(as_.xg) : awayScore * 0.9;

  if (draw) {
    return [
      `${homeName} and ${awayName} were evenly matched, with neither side finding a decisive breakthrough.`,
      `The draw reflected a tactical battle where both managers' game plans largely cancelled each other out.`,
      `Both keepers were rarely tested, as defences dominated and clear-cut chances were at a premium.`,
      `A share of the spoils was a fair result given the balance of xG (${homeXg.toFixed(2)} vs ${awayXg.toFixed(2)}) over 90 minutes.`,
    ];
  }

  if (winner && loser) {
    const domPoss = homeName === winner ? homePoss : awayPoss;
    const defPoss = homeName === loser  ? homePoss : awayPoss;
    return [
      `${winner} controlled the tempo with ${domPoss}% possession, dictating the rhythm throughout the match.`,
      `Clinical finishing from ${winner} punished ${loser}'s high defensive line at crucial moments.`,
      `${loser} struggled to convert their ${defPoss < 45 ? "limited" : "considerable"} possession into genuine scoring chances.`,
      `The xG tally (${homeXg.toFixed(2)} vs ${awayXg.toFixed(2)}) underlines ${winner}'s overall superiority on the night.`,
    ];
  }

  return [
    `${homeName} and ${awayName} produced an entertaining contest with chances at both ends.`,
    `Tactical discipline was key, with both sides pressing high and winning the ball in dangerous areas.`,
    `The wide areas proved pivotal, with crosses and cutbacks creating the majority of clear-cut chances.`,
    `Set-piece delivery was a constant threat, underlining the importance of aerial duels in this fixture.`,
  ];
}

async function analyzeMatchWithClaude(
  matchId: number,
  m: MatchRow,
  hs: StatsRow | undefined,
  as_: StatsRow | undefined,
): Promise<string[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return [];

  const statsText = hs && as_
    ? `\n${String(m.home_name)}: Possession ${String(hs.possession)}% | xG ${String(hs.xg)} | Shots ${String(hs.shots)} (${String(hs.shots_on_target)} on target) | Pass accuracy ${String(hs.pass_accuracy)}% | Corners ${String(hs.corners)} | Fouls ${String(hs.fouls)}
${String(m.away_name)}: Possession ${String(as_.possession)}% | xG ${String(as_.xg)} | Shots ${String(as_.shots)} (${String(as_.shots_on_target)} on target) | Pass accuracy ${String(as_.pass_accuracy)}% | Corners ${String(as_.corners)} | Fouls ${String(as_.fouls)}`
    : "(No detailed stats available)";

  const anthropic = new Anthropic({ apiKey: key });
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

async function analyzeMatch(matchId: number): Promise<{ insights: string[]; method: string }> {
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
  const m = matchRows[0] as MatchRow;
  const hs  = statsRows.find((s) => s.team_name === m.home_name) as StatsRow | undefined;
  const as_ = statsRows.find((s) => s.team_name === m.away_name) as StatsRow | undefined;

  // Try Claude first
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const insights = await analyzeMatchWithClaude(matchId, m, hs, as_);
      if (insights.length > 0) return { insights, method: "claude" };
    } catch { /* fall through to template */ }
  }

  // Algorithmic template fallback
  const insights = templateInsights(
    String(m.home_name), String(m.away_name),
    Number(m.home_score), Number(m.away_score),
    hs, as_,
  );
  return { insights, method: "template" };
}

// POST /api/admin/bulk-analyze
// Body: { days?: number (default 7), maxMatches?: number (default 10) }
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { days?: number; maxMatches?: number };
  const days       = body.days       ?? 7;
  const maxMatches = body.maxMatches ?? 10;

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
  const failed: string[] = [];
  const methods: Record<string, number> = {};

  for (const match of pending) {
    const label = `${String(match.home_name)} ${String(match.home_score)}-${String(match.away_score)} ${String(match.away_name)}`;
    try {
      const { insights, method } = await analyzeMatch(match.id as number);
      if (insights.length === 0) throw new Error("Empty insights");

      await sql`
        INSERT INTO ai_analyses (match_id, insights, model)
        VALUES (${match.id as number}, ${JSON.stringify(insights)}, ${method === "claude" ? "claude-haiku-4-5-20251001" : "template-v1"})
        ON CONFLICT DO NOTHING
      `;
      analyzed.push(label);
      methods[method] = (methods[method] ?? 0) + 1;
    } catch (e) {
      failed.push(`${label}: ${(e as Error).message.slice(0, 50)}`);
    }

    await new Promise((r) => setTimeout(r, process.env.ANTHROPIC_API_KEY ? 1000 : 50));
  }

  return NextResponse.json({
    ok:       true,
    analyzed: analyzed.length,
    failed:   failed.length,
    methods,
    matches:  analyzed,
    errors:   failed,
    total:    pending.length,
  });
}
