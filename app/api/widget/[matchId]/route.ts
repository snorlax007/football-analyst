import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const mid = parseInt(matchId);
  if (isNaN(mid)) return NextResponse.json({ error: "Invalid match id" }, { status: 400 });

  const [matchRows, analysisRows] = await Promise.all([
    sql`
      SELECT m.id, m.home_score, m.away_score, m.status, m.league,
             ht.name AS home_name, ht.short_name AS home_short,
             at.name AS away_name, at.short_name AS away_short
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${mid}
    `,
    sql`
      SELECT insights FROM ai_analyses WHERE match_id = ${mid}
      ORDER BY created_at DESC LIMIT 1
    `,
  ]);

  if (matchRows.length === 0) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const m = matchRows[0];
  const topInsight = analysisRows.length > 0
    ? (analysisRows[0].insights as string[])[0] ?? null
    : null;

  return NextResponse.json({
    matchId: mid,
    homeName: m.home_name, homeShort: m.home_short, homeScore: m.home_score,
    awayName: m.away_name, awayShort: m.away_short, awayScore: m.away_score,
    status: m.status, league: m.league,
    topInsight,
  });
}
