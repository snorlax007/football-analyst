import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import sql from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getPlanLimits, type PlanTier } from "@/lib/stripe";
import { deliverWebhook } from "@/lib/webhooks";
import { inngest } from "@/lib/inngest";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/analysis/[matchId]">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please log in to generate analysis" }, { status: 401 });
  }

  const { allowed: rateOk } = checkRateLimit(`analysis:${session.userId}`, LIMITS.aiGen);
  if (!rateOk) {
    return NextResponse.json({ error: "Too many analysis requests. Please wait a minute." }, { status: 429 });
  }

  const month = new Date().toISOString().slice(0, 7);

  // Determine quota from user's subscription tier or org tier
  const userRows = await sql`
    SELECT subscription_tier FROM users WHERE id = ${session.userId}
  `;
  const userTier = (userRows[0]?.subscription_tier as PlanTier) ?? "free";

  const orgRows = await sql`
    SELECT om.org_id, o.subscription_tier AS org_tier
    FROM org_members om
    JOIN organizations o ON o.id = om.org_id
    WHERE om.user_id = ${session.userId} LIMIT 1
  `;
  const orgId = orgRows.length > 0 ? orgRows[0].org_id : null;
  const orgTier = orgRows.length > 0 ? (orgRows[0].org_tier as PlanTier) : null;

  // Org members inherit org tier; otherwise use personal tier
  const effectiveTier = orgId && orgTier ? orgTier : userTier;
  const quota = getPlanLimits(effectiveTier).analysesPerMonth;

  let used = 0;
  let quotaType: "org" | "personal" = "personal";

  if (orgId) {
    const usageRows = await sql`
      SELECT reports_generated FROM org_usage WHERE org_id = ${orgId} AND month = ${month}
    `;
    used = usageRows.length > 0 ? Number(usageRows[0].reports_generated) : 0;
    quotaType = "org";
  } else {
    const usageRows = await sql`
      SELECT reports_generated FROM user_usage WHERE user_id = ${session.userId} AND month = ${month}
    `;
    used = usageRows.length > 0 ? Number(usageRows[0].reports_generated) : 0;
  }

  if (used >= quota) {
    return NextResponse.json(
      {
        error: `Monthly limit reached (${quota}/${quota}). ${quotaType === "org" ? "Your org's quota is exhausted — upgrade the org plan." : "Upgrade to Pro for more analyses."}`,
        upgradeUrl: "/pricing",
      },
      { status: 403 }
    );
  }

  const { matchId } = await ctx.params;
  const id = parseInt(matchId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid match id" }, { status: 400 });

  // Return cached analysis if generated within the last 24 hours (no quota consumed)
  const cached = await sql`
    SELECT insights, model, created_at FROM ai_analyses
    WHERE match_id = ${id}
      AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC LIMIT 1
  `;
  if (cached.length > 0) {
    return NextResponse.json({
      insights: cached[0].insights as string[],
      model: cached[0].model,
      remaining: quota - used,
      quotaType,
      cached: true,
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const matches = await sql`
    SELECT m.*, ht.name AS home_name, at.name AS away_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.id = ${id}
  `;
  if (matches.length === 0) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const match = matches[0];

  const [stats, players] = await Promise.all([
    sql`
      SELECT ms.*, t.name AS team_name
      FROM match_stats ms JOIN teams t ON ms.team_id = t.id
      WHERE ms.match_id = ${id}
    `,
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

  // Increment quota eagerly (before Claude call to prevent races)
  if (orgId) {
    await sql`
      INSERT INTO org_usage (org_id, month, reports_generated) VALUES (${orgId}, ${month}, 1)
      ON CONFLICT (org_id, month) DO UPDATE SET reports_generated = org_usage.reports_generated + 1
    `;
  } else {
    await sql`
      INSERT INTO user_usage (user_id, month, reports_generated) VALUES (${session.userId}, ${month}, 1)
      ON CONFLICT (user_id, month) DO UPDATE SET reports_generated = user_usage.reports_generated + 1
    `;
  }

  // If Inngest is configured, dispatch to background and return immediately
  if (process.env.INNGEST_EVENT_KEY && process.env.INNGEST_EVENT_KEY !== "local") {
    await inngest.send({
      name: "analysis/requested",
      data: { matchId: id, userId: session.userId, orgId: orgId as string | null, effectiveTier, quotaType, quota },
    });
    return NextResponse.json({ status: "queued", remaining: quota - used - 1, quotaType });
  }

  const prompt = `You are a professional football analyst. Analyze this match and provide 4 sharp, data-driven tactical insights. Reference actual numbers. Be specific, not generic.

Match: ${match.home_name} ${match.home_score}–${match.away_score} ${match.away_name}
Competition: ${match.league ?? "Premier League"} ${match.season ?? ""}
Venue: ${match.venue ?? "N/A"}

${match.home_name}:
  Possession ${hs?.possession}% | xG ${hs?.xg} | Shots ${hs?.shots} (${hs?.shots_on_target} on target)
  Pass accuracy ${hs?.pass_accuracy}% | Pressing intensity ${hs?.press_intensity}%
  Corners ${hs?.corners} | Fouls ${hs?.fouls} | Yellows ${hs?.yellow_cards}

${match.away_name}:
  Possession ${as_?.possession}% | xG ${as_?.xg} | Shots ${as_?.shots} (${as_?.shots_on_target} on target)
  Pass accuracy ${as_?.pass_accuracy}% | Pressing intensity ${as_?.press_intensity}%
  Corners ${as_?.corners} | Fouls ${as_?.fouls} | Yellows ${as_?.yellow_cards}

Top performers:
${players.map((p) => `  ${p.name} (${p.team_name}, ${p.position}): ${p.rating}/10 — ${p.goals}G ${p.assists}A ${p.shots}sh`).join("\n")}

Reply with ONLY valid JSON — no markdown, no commentary:
{"insights":["insight 1","insight 2","insight 3","insight 4"]}`;

  const message = await getAnthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });

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

  return NextResponse.json({
    insights,
    model: "claude-sonnet-4-6",
    remaining: quota - used - 1,
    quotaType,
  });
}
