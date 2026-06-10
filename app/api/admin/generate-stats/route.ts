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

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

async function generateStats(
  homeTeam: string, awayTeam: string,
  homeScore: number, awayScore: number,
  competition: string
): Promise<GeneratedStats | null> {
  const anthropic = getAnthropic();
  if (!anthropic) return null;

  try {
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
    // Extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as GeneratedStats;
  } catch {
    return null;
  }
}

// POST /api/admin/generate-stats
// Generates Claude-powered stats for all finished matches that have no stats yet
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { matchId?: number; days?: number };
  const days = body.days ?? 7;

  // Find finished matches with scores but no stats
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
  const failed:    string[] = [];

  for (const m of matches) {
    const comp = (m.competition ?? m.league ?? "International") as string;
    const stats = await generateStats(
      m.home_name as string, m.away_name as string,
      m.home_score as number, m.away_score as number,
      comp
    );

    if (!stats) { failed.push(`${m.id}`); continue; }

    try {
      await sql`
        INSERT INTO match_stats (
          match_id, team_id, possession, shots, shots_on_target, xg,
          pass_accuracy, passes, corners, fouls, yellow_cards, red_cards,
          offsides, press_intensity
        ) VALUES (
          ${m.id as number}, ${m.home_team_id as number},
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
          ${m.id as number}, ${m.away_team_id as number},
          ${stats.away.possession}, ${stats.away.shots}, ${stats.away.shots_on_target},
          ${stats.away.xg}, ${stats.away.pass_accuracy}, ${stats.away.passes},
          ${stats.away.corners}, ${stats.away.fouls}, ${stats.away.yellow_cards},
          ${stats.away.red_cards}, ${stats.away.offsides}, ${stats.away.press_intensity}
        )
        ON CONFLICT (match_id, team_id) DO NOTHING
      `;
      processed.push(`${m.home_name} vs ${m.away_name} (${m.id})`);
    } catch (e) {
      failed.push(`${m.id}: ${(e as Error).message.slice(0, 40)}`);
    }

    // Small delay to avoid Claude rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({
    ok:        true,
    processed: processed.length,
    failed:    failed.length,
    matches:   processed,
    errors:    failed,
  });
}
