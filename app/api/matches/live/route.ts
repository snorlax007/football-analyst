import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// Returns all live matches for client-side polling on the matches list
export async function GET() {
  // Add current_minute column if it doesn't exist yet
  try {
    await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_minute INT DEFAULT NULL`;
  } catch { /* column exists or table not ready — ignore */ }

  const matches = await sql`
    SELECT
      m.id, m.home_score, m.away_score, m.status, m.current_minute,
      ht.name AS home_name, ht.short_name AS home_short,
      at.name AS away_name, at.short_name AS away_short
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.status = 'live'
    ORDER BY m.match_date DESC
  `;

  return NextResponse.json(
    matches.map((m) => ({
      id: m.id,
      homeScore: m.home_score,
      awayScore: m.away_score,
      status: m.status,
      currentMinute: (m.current_minute ?? null) as number | null,
      homeName: m.home_name,
      homeShort: m.home_short,
      awayName: m.away_name,
      awayShort: m.away_short,
    }))
  );
}
