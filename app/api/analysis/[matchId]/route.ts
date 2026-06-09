import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import sql from "@/lib/db";
import { getSession, FREE_LIMIT, ORG_QUOTA } from "@/lib/auth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/analysis/[matchId]">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please log in to generate analysis" }, { status: 401 });
  }

  const month = new Date().toISOString().slice(0, 7);

  // Check if user is in an org — org members share a higher quota
  const orgRows = await sql`
    SELECT om.org_id FROM org_members om WHERE om.user_id = ${session.userId} LIMIT 1
  `;
  const orgId = orgRows.length > 0 ? orgRows[0].org_id : null;

  let used = 0;
  let quota = FREE_LIMIT;
  let quotaType: "org" | "personal" = "personal";

  if (orgId) {
    const usageRows = await sql`
      SELECT reports_generated FROM org_usage WHERE org_id = ${orgId} AND month = ${month}
    `;
    used = usageRows.length > 0 ? Number(usageRows[0].reports_generated) : 0;
    quota = ORG_QUOTA;
    quotaType = "org";
  } else {
    const usageRows = await sql`
      SELECT reports_generated FROM user_usage WHERE user_id = ${session.userId} AND month = ${month}
    `;
    used = usageRows.length > 0 ? Number(usageRows[0].reports_generated) : 0;
  }

  if (used >= quota) {
    return NextResponse.json(
      { error: `Monthly limit reached (${quota}/${quota}). ${quotaType === "org" ? "Contact your org owner to upgrade." : "Upgrade to Pro for unlimited analyses."}` },
      { status: 403 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const { matchId } = await ctx.params;
  const id = parseInt(matchId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid match id" }, { status: 400 });

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

  const message = await anthropic.messages.create({
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

  // Increment quota
  if (orgId) {
    await sql`
      INSERT INTO org_usage (org_id, month, reports_generated)
      VALUES (${orgId}, ${month}, 1)
      ON CONFLICT (org_id, month)
      DO UPDATE SET reports_generated = org_usage.reports_generated + 1
    `;
  } else {
    await sql`
      INSERT INTO user_usage (user_id, month, reports_generated)
      VALUES (${session.userId}, ${month}, 1)
      ON CONFLICT (user_id, month)
      DO UPDATE SET reports_generated = user_usage.reports_generated + 1
    `;
  }

  return NextResponse.json({
    insights,
    model: "claude-sonnet-4-6",
    remaining: quota - used - 1,
    quotaType,
  });
}
