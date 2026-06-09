import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { sendWeeklyDigest } from "@/lib/email";

export const runtime = "nodejs";

function verifyCronSecret(req: NextRequest): boolean {
  return req.headers.get("x-cron-secret") === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Last 7 days of finished matches
  const since = new Date();
  since.setDate(since.getDate() - 7);

  // Get all users who follow at least one team
  const users = await sql`
    SELECT DISTINCT u.id, u.email, u.name
    FROM users u
    JOIN followed_teams ft ON ft.user_id = u.id
  `;

  let emailsSent = 0;

  for (const user of users) {
    // Get their followed teams
    const followedTeamIds = await sql`
      SELECT team_id FROM followed_teams WHERE user_id = ${user.id as string}
    `;
    const teamIds = followedTeamIds.map((r) => r.team_id as number);
    if (teamIds.length === 0) continue;

    // Get matches from last 7 days for their teams
    const matches = await sql`
      SELECT m.id, m.home_score, m.away_score, m.league, m.match_date,
             ht.name AS home_name, at.name AS away_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.status = 'finished'
        AND m.match_date >= ${since.toISOString()}
        AND (m.home_team_id = ANY(${teamIds}) OR m.away_team_id = ANY(${teamIds}))
      ORDER BY m.match_date DESC
      LIMIT 10
    `;

    if (matches.length === 0) continue;

    await sendWeeklyDigest(
      user.email as string,
      user.name as string,
      matches.map((m) => ({
        homeTeam: m.home_name as string,
        awayTeam: m.away_name as string,
        homeScore: m.home_score as number,
        awayScore: m.away_score as number,
        league: m.league as string,
        matchId: m.id as number,
        matchDate: String(m.match_date),
      }))
    );

    emailsSent++;
  }

  return NextResponse.json({ ok: true, emailsSent });
}
