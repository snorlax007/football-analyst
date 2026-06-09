import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { sendPushToTeamFollowers } from "@/lib/push";
import { sendPostMatchEmail } from "@/lib/email";

export const runtime = "nodejs";

function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return secret === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10);

  // Find matches that finished yesterday
  const matches = await sql`
    SELECT m.id, m.home_score, m.away_score, m.league,
           ht.id AS home_team_id, at.id AS away_team_id,
           ht.name AS home_name, at.name AS away_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.status = 'finished'
      AND DATE(m.match_date) = ${dateStr}
  `;

  const processed: number[] = [];

  for (const match of matches) {
    // Get the latest AI analysis for this match
    const analyses = await sql`
      SELECT insights FROM ai_analyses WHERE match_id = ${match.id as number}
      ORDER BY created_at DESC LIMIT 1
    `;
    const insights: string[] = analyses.length > 0
      ? (Array.isArray(analyses[0].insights)
          ? analyses[0].insights
          : JSON.parse(analyses[0].insights as string))
      : [];

    // Send push notifications to followers of both teams
    const pushPayload = {
      title: `FT: ${String(match.home_name)} ${String(match.home_score)}–${String(match.away_score)} ${String(match.away_name)}`,
      body: insights[0] ?? `${match.league} · Full time`,
      url: `/matches/${String(match.id)}`,
      tag: `match-${String(match.id)}`,
    };

    await Promise.allSettled([
      sendPushToTeamFollowers(match.home_team_id as number, pushPayload),
      sendPushToTeamFollowers(match.away_team_id as number, pushPayload),
    ]);

    // Send post-match email to all followers of either team
    const followers = await sql`
      SELECT DISTINCT u.id, u.email, u.name
      FROM followed_teams ft
      JOIN users u ON ft.user_id = u.id
      WHERE ft.team_id IN (${match.home_team_id as number}, ${match.away_team_id as number})
    `;

    await Promise.allSettled(
      followers.map((u) =>
        sendPostMatchEmail(u.email as string, u.name as string, {
          homeTeam: match.home_name as string,
          awayTeam: match.away_name as string,
          homeScore: match.home_score as number,
          awayScore: match.away_score as number,
          league: match.league as string,
          matchId: match.id as number,
          insights,
        })
      )
    );

    processed.push(match.id as number);
  }

  return NextResponse.json({
    ok: true,
    date: dateStr,
    matchesProcessed: processed.length,
    matchIds: processed,
  });
}
