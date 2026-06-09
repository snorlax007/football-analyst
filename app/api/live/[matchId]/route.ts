import { NextRequest } from "next/server";
import sql from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Event types that get AI commentary
const COMMENTARY_TYPES = new Set([
  "goal", "own_goal", "var", "penalty", "red_card",
  "yellow_card", "substitution", "corner",
]);

async function generateEventComment(
  event: Record<string, unknown>,
  matchContext: string
): Promise<string> {
  if (!anthropic) return "";
  try {
    const typeDescriptions: Record<string, string> = {
      goal: "GOAL SCORED",
      own_goal: "OWN GOAL",
      yellow_card: "yellow card shown",
      red_card: "RED CARD — player sent off",
      substitution: "substitution",
      var: "VAR review",
      penalty: "penalty",
      corner: "corner kick opportunity",
    };
    const typeLabel = typeDescriptions[event.type as string] ?? String(event.type);
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [{
        role: "user",
        content: `Live football commentator. ONE sharp sentence (max 18 words) about: ${typeLabel} — ${String(event.player_name ?? "unknown")} (${String(event.description ?? "")}) at ${String(event.minute ?? "?")}'. Match: ${matchContext}. No emojis.`,
      }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  } catch {
    return "";
  }
}

interface LiveStats {
  team_id: number;
  possession: number;
  shots: number;
  shots_on_target: number;
  xg: number;
  corners: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const id = parseInt(matchId);
  if (isNaN(id)) return new Response("Invalid match ID", { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastEventId: string | null = null;
      let lastStatsHash = "";
      let lastMinute: number | null = -1;
      let closed = false;

      req.signal.addEventListener("abort", () => {
        closed = true;
        try { controller.close(); } catch {}
      });

      function send(data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      }

      async function poll() {
        if (closed) return;

        try {
          const [matches, eventsRows, statsRows] = await Promise.all([
            sql`
              SELECT m.id, m.home_score, m.away_score, m.status, m.match_date,
                     m.current_minute,
                     ht.name AS home_name, ht.short_name AS home_short,
                     at.name AS away_name, at.short_name AS away_short,
                     ht.id AS home_team_id, at.id AS away_team_id
              FROM matches m
              JOIN teams ht ON m.home_team_id = ht.id
              JOIN teams at ON m.away_team_id = at.id
              WHERE m.id = ${id}
            `,
            sql`
              SELECT le.id, le.type, le.minute, le.player_name,
                     le.description, le.ai_comment, t.name AS team_name,
                     le.team_id, le.created_at
              FROM live_events le
              LEFT JOIN teams t ON le.team_id = t.id
              WHERE le.match_id = ${id}
              ORDER BY le.created_at ASC
            `,
            sql`
              SELECT ms.team_id, ms.possession, ms.shots, ms.shots_on_target,
                     ms.xg, ms.corners, ms.fouls, ms.yellow_cards, ms.red_cards
              FROM match_stats ms
              WHERE ms.match_id = ${id}
            `,
          ]);

          if (matches.length === 0) {
            send({ type: "error", message: "Match not found" });
            closed = true;
            try { controller.close(); } catch {}
            return;
          }

          const match = matches[0];

          // Detect new events since last poll
          const newEvents = lastEventId
            ? eventsRows.filter((e) => String(e.id) > lastEventId!)
            : eventsRows;

          if (newEvents.length > 0) {
            const matchContext = `${String(match.home_name)} ${String(match.home_score)}-${String(match.away_score)} ${String(match.away_name)}`;

            for (const ev of newEvents) {
              if (!ev.ai_comment && COMMENTARY_TYPES.has(ev.type as string)) {
                const comment = await generateEventComment(ev, matchContext);
                if (comment) {
                  await sql`UPDATE live_events SET ai_comment = ${comment} WHERE id = ${ev.id as string}`;
                  ev.ai_comment = comment;
                }
              }
              send({ type: "event", event: ev });
            }
            lastEventId = String(eventsRows[eventsRows.length - 1]?.id ?? lastEventId);
          }

          // Send state update when score/status/minute changes
          const minute = (match.current_minute ?? null) as number | null;
          const stateChanged = minute !== lastMinute;
          lastMinute = minute;

          send({
            type: "state",
            match: {
              id: match.id,
              homeScore: match.home_score,
              awayScore: match.away_score,
              status: match.status,
              currentMinute: match.current_minute ?? null,
              homeName: match.home_name,
              awayName: match.away_name,
              homeShort: match.home_short,
              awayShort: match.away_short,
              homeTeamId: match.home_team_id,
              awayTeamId: match.away_team_id,
            },
            eventCount: eventsRows.length,
          });

          // Send stats when they change
          if (statsRows.length > 0) {
            const statsHash = JSON.stringify(statsRows.map((s) => ({
              t: s.team_id, p: s.possession, s: s.shots, xg: s.xg,
            })));
            if (statsHash !== lastStatsHash || stateChanged) {
              lastStatsHash = statsHash;
              const home = statsRows.find((s) => s.team_id === match.home_team_id) as LiveStats | undefined;
              const away = statsRows.find((s) => s.team_id === match.away_team_id) as LiveStats | undefined;
              send({
                type: "stats",
                homeStats: home ?? null,
                awayStats: away ?? null,
              });
            }
          }

          if (match.status === "finished") {
            send({ type: "finished" });
            closed = true;
            try { controller.close(); } catch {}
            return;
          }
        } catch {
          send({ type: "heartbeat" });
        }

        if (!closed) {
          // Poll faster for live matches
          const interval = 5000;
          setTimeout(poll, interval);
        }
      }

      send({ type: "connected", matchId: id });
      await poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
