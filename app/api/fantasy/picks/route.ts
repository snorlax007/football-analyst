import { NextResponse } from "next/server";
import sql from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

// FPL-compatible scoring: goals×6 + assists×3 + rating_bonus + appearance_bonus
function calcFplScore(goals: number, assists: number, rating: number, matches: number): number {
  const ratingBonus = rating >= 9 ? 3 : rating >= 8 ? 2 : rating >= 7 ? 1 : 0;
  const appearanceBonus = Math.min(matches * 1, 5);
  return goals * 6 + assists * 3 + ratingBonus * matches + appearanceBonus;
}

export async function GET() {
  const players = await sql`
    SELECT
      p.id, p.name, p.position, p.age,
      t.name AS team_name,
      COUNT(pr.id)::int AS matches_played,
      ROUND(AVG(pr.rating)::numeric, 2) AS avg_rating,
      SUM(pr.goals)::int AS goals,
      SUM(pr.assists)::int AS assists,
      ROUND(AVG(pr.pass_accuracy)::numeric, 1) AS avg_pass_accuracy,
      SUM(pr.shots)::int AS shots,
      ROUND(AVG(pr.tackles)::numeric, 1) AS avg_tackles
    FROM players p
    JOIN teams t ON p.team_id = t.id
    LEFT JOIN player_ratings pr ON pr.player_id = p.id
    GROUP BY p.id, p.name, p.position, p.age, t.name
    HAVING COUNT(pr.id) > 0
    ORDER BY AVG(pr.rating) DESC
  `;

  type ScoredPlayer = (typeof players)[number] & { fplScore: number; fplRating: number; formRating: string };

  const scored: ScoredPlayer[] = players.map((p) => {
    const fplScore = calcFplScore(
      Number(p.goals), Number(p.assists), Number(p.avg_rating), Number(p.matches_played)
    );
    const fplRating = Math.round(Number(p.avg_rating) * 10);
    const formRating = Number(p.avg_rating) >= 8 ? "🔥 Hot" : Number(p.avg_rating) >= 7 ? "✅ Good" : "⚠ Patchy";
    return { ...p, fplScore, fplRating, formRating };
  }).sort((a, b) => b.fplScore - a.fplScore);

  // Pick best XI by position
  const picks: typeof scored = [];
  const needed = { GK: 1, DEF: 4, MID: 4, FWD: 2 };
  const counts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

  for (const p of scored) {
    const pos = (p.position as string).toUpperCase();
    const bucket = pos.includes("GK") ? "GK"
      : pos.includes("B") && !pos.includes("AM") ? "DEF"
      : pos.includes("M") ? "MID"
      : "FWD";
    if (counts[bucket] < (needed[bucket] ?? 0)) {
      picks.push(p);
      counts[bucket]++;
    }
    if (picks.length === 11) break;
  }

  // Fill remaining spots if positions are unbalanced
  if (picks.length < 11) {
    for (const p of scored) {
      if (!picks.find((pk) => pk.id === p.id)) {
        picks.push(p);
        if (picks.length === 11) break;
      }
    }
  }

  // Generate AI reasoning
  let aiReason = "";
  if (process.env.ANTHROPIC_API_KEY && picks.length > 0) {
    try {
      const client = new Anthropic();
      const summary = picks.slice(0, 5).map((p) =>
        `${p.name} (${p.position}, ${p.team_name}) — ${p.goals}G ${p.assists}A, avg rating ${p.avg_rating}`
      ).join("; ");
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{
          role: "user",
          content: `Fantasy football analyst: write 1-2 sentences of reasoning for these top weekly picks: ${summary}. Focus on form and why they're must-haves this week.`,
        }],
      });
      aiReason = (msg.content[0] as { text: string }).text;
    } catch { aiReason = ""; }
  }

  return NextResponse.json({
    week: new Date().toISOString().slice(0, 10),
    picks: picks.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team: p.team_name,
      fplScore: p.fplScore,
      fplRating: p.fplRating,
      formRating: p.formRating,
      goals: p.goals,
      assists: p.assists,
      avgRating: Number(p.avg_rating),
    })),
    allPlayers: scored.slice(0, 30).map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team: p.team_name,
      fplScore: p.fplScore,
      fplRating: p.fplRating,
      formRating: p.formRating,
      goals: p.goals,
      assists: p.assists,
      avgRating: Number(p.avg_rating),
    })),
    aiReason,
  });
}
