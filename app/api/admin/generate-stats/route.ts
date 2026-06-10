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

interface GeneratedStats {
  home: {
    possession: number; shots: number; shots_on_target: number; xg: number;
    pass_accuracy: number; passes: number; corners: number; fouls: number;
    yellow_cards: number; red_cards: number; offsides: number; press_intensity: number;
  };
  away: {
    possession: number; shots: number; shots_on_target: number; xg: number;
    pass_accuracy: number; passes: number; corners: number; fouls: number;
    yellow_cards: number; red_cards: number; offsides: number; press_intensity: number;
  };
}

// Deterministic seeded PRNG so the same match always gets the same stats
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function algorithmicStats(homeScore: number, awayScore: number, matchId: number): GeneratedStats {
  const r = seededRand(matchId * 17 + homeScore * 100 + awayScore);
  const diff = homeScore - awayScore;
  const totalGoals = homeScore + awayScore;

  let homePoss = 50 + diff * 5 + (r() * 10 - 5);
  homePoss = Math.max(32, Math.min(68, Math.round(homePoss)));
  const awayPoss = 100 - homePoss;

  const baseShots = 8 + totalGoals * 2;
  const homeShots = Math.max(homeScore, Math.round(baseShots * (homePoss / 100) * 1.2 + homeScore * 1.5 + r() * 3));
  const awayShots = Math.max(awayScore, Math.round(baseShots * (awayPoss / 100) * 1.2 + awayScore * 1.5 + r() * 3));
  const homeSoT = Math.max(homeScore, Math.round(homeShots * (0.35 + r() * 0.2)));
  const awaySoT = Math.max(awayScore, Math.round(awayShots * (0.35 + r() * 0.2)));
  const homeXg = +Math.max(homeScore * 0.7, homeScore * (0.8 + r() * 0.4) + r() * 0.5).toFixed(2);
  const awayXg = +Math.max(awayScore * 0.7, awayScore * (0.8 + r() * 0.4) + r() * 0.5).toFixed(2);

  return {
    home: {
      possession:      homePoss,
      shots:           homeShots,
      shots_on_target: homeSoT,
      xg:              homeXg,
      pass_accuracy:   Math.round(Math.max(72, Math.min(91, 78 + (homePoss - 50) * 0.3 + r() * 6))),
      passes:          Math.round(350 + homePoss * 4 + r() * 80),
      corners:         Math.round(4 + homeScore + r() * 4),
      fouls:           Math.round(9 + r() * 6),
      yellow_cards:    Math.round(r() * 3),
      red_cards:       r() > 0.95 ? 1 : 0,
      offsides:        Math.round(1 + r() * 4),
      press_intensity: Math.round(Math.max(45, Math.min(80, 55 + (homePoss - 50) * 0.5 + r() * 15))),
    },
    away: {
      possession:      awayPoss,
      shots:           awayShots,
      shots_on_target: awaySoT,
      xg:              awayXg,
      pass_accuracy:   Math.round(Math.max(72, Math.min(91, 78 + (awayPoss - 50) * 0.3 + r() * 6))),
      passes:          Math.round(350 + awayPoss * 4 + r() * 80),
      corners:         Math.round(4 + awayScore + r() * 4),
      fouls:           Math.round(9 + r() * 6),
      yellow_cards:    Math.round(r() * 3),
      red_cards:       r() > 0.95 ? 1 : 0,
      offsides:        Math.round(1 + r() * 4),
      press_intensity: Math.round(Math.max(45, Math.min(80, 55 + (awayPoss - 50) * 0.5 + r() * 15))),
    },
  };
}

async function generateStatsWithClaude(
  homeTeam: string, awayTeam: string,
  homeScore: number, awayScore: number,
  competition: string,
): Promise<GeneratedStats | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const anthropic = new Anthropic({ apiKey: key });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Generate realistic football match statistics for: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam} (${competition}).
Return ONLY valid JSON, no explanation. Format:
{"home":{"possession":56,"shots":14,"shots_on_target":6,"xg":1.82,"pass_accuracy":84,"passes":420,"corners":6,"fouls":11,"yellow_cards":1,"red_cards":0,"offsides":2,"press_intensity":68},"away":{"possession":44,"shots":8,"shots_on_target":3,"xg":0.91,"pass_accuracy":79,"passes":330,"corners":4,"fouls":13,"yellow_cards":2,"red_cards":0,"offsides":1,"press_intensity":58}}
Make stats consistent with the scoreline. Possession must sum to 100.`,
      }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as GeneratedStats;
  } catch {
    return null;
  }
}

// POST /api/admin/generate-stats
// Uses Claude when ANTHROPIC_API_KEY is set, algorithmic fallback otherwise.
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { matchId?: number; days?: number };
  const days = body.days ?? 7;
  const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY;

  let matchesQuery;
  if (body.matchId) {
    matchesQuery = sql`
      SELECT m.id, m.home_score, m.away_score, m.league, m.competition,
             ht.id AS home_team_id, ht.name AS home_name,
             at.id AS away_team_id, at.name AS away_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${body.matchId}
        AND m.status = 'finished'
        AND NOT EXISTS (SELECT 1 FROM match_stats ms WHERE ms.match_id = m.id)
    `;
  } else {
    matchesQuery = sql`
      SELECT m.id, m.home_score, m.away_score, m.league, m.competition,
             ht.id AS home_team_id, ht.name AS home_name,
             at.id AS away_team_id, at.name AS away_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.status = 'finished'
        AND m.match_date >= NOW() - (${days} || ' days')::INTERVAL
        AND NOT EXISTS (SELECT 1 FROM match_stats ms WHERE ms.match_id = m.id)
      ORDER BY m.match_date DESC
      LIMIT 20
    `;
  }

  const matches = await matchesQuery;
  const processed: string[] = [];
  const failed: string[] = [];

  for (const m of matches) {
    const comp = (m.competition ?? m.league ?? "International") as string;
    const homeScore = m.home_score as number;
    const awayScore = m.away_score as number;
    const matchId = m.id as number;

    let stats: GeneratedStats | null = null;
    if (hasClaudeKey) {
      stats = await generateStatsWithClaude(m.home_name as string, m.away_name as string, homeScore, awayScore, comp);
    }
    if (!stats) {
      stats = algorithmicStats(homeScore, awayScore, matchId);
    }

    try {
      await sql`
        INSERT INTO match_stats (
          match_id, team_id, possession, shots, shots_on_target, xg,
          pass_accuracy, passes, corners, fouls, yellow_cards, red_cards,
          offsides, press_intensity
        ) VALUES (
          ${matchId}, ${m.home_team_id as number},
          ${stats.home.possession}, ${stats.home.shots}, ${stats.home.shots_on_target},
          ${stats.home.xg}, ${stats.home.pass_accuracy}, ${stats.home.passes},
          ${stats.home.corners}, ${stats.home.fouls}, ${stats.home.yellow_cards},
          ${stats.home.red_cards}, ${stats.home.offsides}, ${stats.home.press_intensity}
        )
        ON CONFLICT (match_id, team_id) DO NOTHING
      `;
      await sql`
        INSERT INTO match_stats (
          match_id, team_id, possession, shots, shots_on_target, xg,
          pass_accuracy, passes, corners, fouls, yellow_cards, red_cards,
          offsides, press_intensity
        ) VALUES (
          ${matchId}, ${m.away_team_id as number},
          ${stats.away.possession}, ${stats.away.shots}, ${stats.away.shots_on_target},
          ${stats.away.xg}, ${stats.away.pass_accuracy}, ${stats.away.passes},
          ${stats.away.corners}, ${stats.away.fouls}, ${stats.away.yellow_cards},
          ${stats.away.red_cards}, ${stats.away.offsides}, ${stats.away.press_intensity}
        )
        ON CONFLICT (match_id, team_id) DO NOTHING
      `;
      processed.push(`${m.home_name} vs ${m.away_name} (${matchId})`);
    } catch (e) {
      failed.push(`${matchId}: ${(e as Error).message.slice(0, 40)}`);
    }

    if (hasClaudeKey) await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({
    ok:        true,
    processed: processed.length,
    failed:    failed.length,
    method:    hasClaudeKey ? "claude" : "algorithmic",
    matches:   processed,
    errors:    failed,
  });
}
