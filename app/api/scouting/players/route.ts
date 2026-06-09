import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { sanitizeSearch } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { allowed } = checkRateLimit(`search:${session.userId}`, LIMITS.search);
  if (!allowed) {
    return NextResponse.json({ error: "Too many search requests. Please slow down." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const position = searchParams.get("position") ?? "";
  const nlQuery = sanitizeSearch(searchParams.get("q") ?? "");
  const minRating = parseFloat(searchParams.get("minRating") ?? "0");
  const minGoals = parseInt(searchParams.get("minGoals") ?? "0");
  const minAssists = parseInt(searchParams.get("minAssists") ?? "0");
  const minPassAcc = parseFloat(searchParams.get("minPassAcc") ?? "0");

  // Fetch all players with their latest match stats (aggregate across matches)
  const players = await sql`
    SELECT
      p.id,
      p.name,
      p.position,
      p.age,
      t.name AS team_name,
      t.id AS team_id,
      COUNT(pr.id)::int AS matches_played,
      ROUND(AVG(pr.rating)::numeric, 2) AS avg_rating,
      SUM(pr.goals)::int AS total_goals,
      SUM(pr.assists)::int AS total_assists,
      ROUND(AVG(pr.pass_accuracy)::numeric, 1) AS avg_pass_accuracy,
      ROUND(AVG(pr.tackles)::numeric, 1) AS avg_tackles,
      SUM(pr.shots)::int AS total_shots
    FROM players p
    JOIN teams t ON p.team_id = t.id
    LEFT JOIN player_ratings pr ON pr.player_id = p.id
    GROUP BY p.id, p.name, p.position, p.age, t.name, t.id
    HAVING COUNT(pr.id) > 0
    ORDER BY AVG(pr.rating) DESC NULLS LAST
    LIMIT 100
  `;

  let filtered = players.filter((p) => {
    if (position && !(p.position as string).toUpperCase().includes(position.toUpperCase())) return false;
    if (Number(p.avg_rating) < minRating) return false;
    if (Number(p.total_goals) < minGoals) return false;
    if (Number(p.total_assists) < minAssists) return false;
    if (Number(p.avg_pass_accuracy) < minPassAcc) return false;
    return true;
  });

  let aiSummary = "";

  // NL query: use Claude to rank/filter
  if (nlQuery && process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const playerList = filtered.slice(0, 40).map((p, i) =>
        `${i + 1}. ${p.name} (${p.position}, ${p.team_name}) — rating ${p.avg_rating}, goals ${p.total_goals}, assists ${p.total_assists}, pass% ${p.avg_pass_accuracy}, tackles ${p.avg_tackles}`
      ).join("\n");

      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `You are a football scouting AI. The user is looking for: "${nlQuery}"

Available players:
${playerList}

Return a JSON object with two fields:
1. "rankedIds": array of player numbers (1-based) in order of best match for the query (top 10 max)
2. "summary": one sentence explaining what you found and why

Respond with ONLY valid JSON.`,
        }],
      });

      const raw = (msg.content[0] as { text: string }).text;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { rankedIds: number[]; summary: string };
        aiSummary = parsed.summary;
        const ranked = parsed.rankedIds
          .filter((n) => n >= 1 && n <= filtered.length)
          .map((n) => filtered[n - 1]);
        if (ranked.length > 0) filtered = ranked;
      }
    } catch {
      // fall through to unranked results
    }
  }

  return NextResponse.json({ players: filtered, aiSummary, total: filtered.length });
}
