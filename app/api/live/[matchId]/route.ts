import { NextRequest } from "next/server";
import sql from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
// Disable caching so SSE streams properly
export const dynamic = "force-dynamic";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

async function generateEventComment(event: Record<string, unknown>, matchContext: string): Promise<string> {
  if (!anthropic) return "";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [{
        role: "user",
        content: `You are a live football commentator. Write ONE sharp, energetic sentence (max 20 words) about this event. No emojis. Event: ${String(event.type)} by ${String(event.player_name ?? "unknown")} (${String(event.description ?? "")}) at minute ${String(event.minute ?? "?")}. Context: ${matchContext}`,
      }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  } catch {
    return "";
  }
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
          const [matches, eventsRows] = await Promise.all([
            sql`
              SELECT m.id, m.home_score, m.away_score, m.status, m.match_date,
                     ht.name AS home_name, ht.short_name AS home_short,
                     at.name AS away_name, at.short_name AS away_short,
                     ht.id AS home_team_id, at.id AS away_team_id
              FROM matches m
              JOIN teams ht ON m.home_team_id = ht.id
              JOIN teams at ON m.away_team_id = at.id
              WHERE m.id = ${id}
            `,
            sql`
              SELECT id, type, minute, player_name, description, ai_comment,
                     t.name AS team_name, created_at
              FROM live_events le
              LEFT JOIN teams t ON le.team_id = t.id
              WHERE le.match_id = ${id}
              ORDER BY created_at ASC
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
              // Generate AI comment if not already set
              if (!ev.ai_comment && (ev.type === "goal" || ev.type === "var" || ev.type === "penalty")) {
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

          // Always send current match state
          send({
            type: "state",
            match: {
              id: match.id,
              homeScore: match.home_score,
              awayScore: match.away_score,
              status: match.status,
              homeName: match.home_name,
              awayName: match.away_name,
              homeShort: match.home_short,
              awayShort: match.away_short,
            },
            eventCount: eventsRows.length,
          });

          // Stop polling once match is finished
          if (match.status === "finished") {
            send({ type: "finished" });
            closed = true;
            try { controller.close(); } catch {}
            return;
          }
        } catch (err) {
          send({ type: "heartbeat" });
        }

        if (!closed) {
          setTimeout(poll, 10000); // poll every 10s
        }
      }

      // Initial send immediately, then poll
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
