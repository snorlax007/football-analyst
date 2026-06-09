import { Inngest } from "inngest";
import Anthropic from "@anthropic-ai/sdk";
import sql from "@/lib/db";
import { getPlanLimits, type PlanTier } from "@/lib/stripe";
import { deliverWebhook } from "@/lib/webhooks";

export const inngest = new Inngest({
  id: "football-analyst",
  eventKey: process.env.INNGEST_EVENT_KEY ?? "local",
});

// ── Event types ───────────────────────────────────────────────────────────────
export interface AnalysisRequestedEvent {
  name: "analysis/requested";
  data: {
    matchId: number;
    userId: string;
    orgId: string | null;
    effectiveTier: string;
    quotaType: "org" | "personal";
    quota: number;
  };
}

// ── Background function: run Claude analysis ──────────────────────────────────
export const generateAnalysis = inngest.createFunction(
  { id: "generate-match-analysis", retries: 2, triggers: [{ event: "analysis/requested" }] },
  async ({ event }: { event: { data: AnalysisRequestedEvent["data"] } }) => {
    const { matchId, userId, orgId, quotaType, quota } = event.data;
    const id = matchId;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const matches = await sql`
      SELECT m.*, ht.name AS home_name, at.name AS away_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${id}
    `;
    if (matches.length === 0) throw new Error(`Match ${id} not found`);
    const match = matches[0];

    const [stats, players] = await Promise.all([
      sql`SELECT ms.*, t.name AS team_name FROM match_stats ms JOIN teams t ON ms.team_id = t.id WHERE ms.match_id = ${id}`,
      sql`
        SELECT pr.*, p.name, p.position, t.name AS team_name
        FROM player_ratings pr
        JOIN players p ON pr.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        WHERE pr.match_id = ${id}
        ORDER BY pr.rating DESC LIMIT 6
      `,
    ]);

    const hs = stats.find((s) => s.team_id === match.home_team_id);
    const as_ = stats.find((s) => s.team_id === match.away_team_id);

    const prompt = `You are a professional football analyst. Analyze this match and provide 4 sharp, data-driven tactical insights. Reference actual numbers. Be specific, not generic.

Match: ${match.home_name} ${match.home_score}–${match.away_score} ${match.away_name}
Competition: ${match.league ?? "Premier League"} ${match.season ?? ""}

${match.home_name}: Possession ${hs?.possession}% | xG ${hs?.xg} | Shots ${hs?.shots} (${hs?.shots_on_target} on target) | Pass accuracy ${hs?.pass_accuracy}%
${match.away_name}: Possession ${as_?.possession}% | xG ${as_?.xg} | Shots ${as_?.shots} (${as_?.shots_on_target} on target) | Pass accuracy ${as_?.pass_accuracy}%

Top performers:
${players.map((p) => `  ${p.name} (${p.team_name}, ${p.position}): ${p.rating}/10 — ${p.goals}G ${p.assists}A`).join("\n")}

Reply with ONLY valid JSON — no markdown:
{"insights":["insight 1","insight 2","insight 3","insight 4"]}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    const { insights } = JSON.parse(jsonMatch[0]) as { insights: string[] };

    await sql`
      INSERT INTO ai_analyses (match_id, insights, model)
      VALUES (${id}, ${JSON.stringify(insights)}, ${"claude-sonnet-4-6"})
    `;

    // Fire webhook for org members
    if (orgId) {
      deliverWebhook(orgId, "match.analysis.completed", {
        match_id: id,
        home_team: match.home_name,
        away_team: match.away_name,
        score: { home: match.home_score, away: match.away_score },
        insights,
      }).catch(() => {});
    }

    // Increment quota
    const month = new Date().toISOString().slice(0, 7);
    if (orgId) {
      await sql`
        INSERT INTO org_usage (org_id, month, reports_generated) VALUES (${orgId}, ${month}, 1)
        ON CONFLICT (org_id, month) DO UPDATE SET reports_generated = org_usage.reports_generated + 1
      `;
    } else {
      await sql`
        INSERT INTO user_usage (user_id, month, reports_generated) VALUES (${userId}, ${month}, 1)
        ON CONFLICT (user_id, month) DO UPDATE SET reports_generated = user_usage.reports_generated + 1
      `;
    }

    // Send push notification to user
    const { sendPushToUser } = await import("@/lib/push");
    await sendPushToUser(userId, {
      title: "Analysis ready ⚽",
      body: `${match.home_name} vs ${match.away_name} — ${insights.length} tactical insights generated`,
      url: `/matches/${id}`,
      tag: `analysis-${id}`,
    });

    return { matchId: id, insights, quota: quota - 1 };
  }
);
