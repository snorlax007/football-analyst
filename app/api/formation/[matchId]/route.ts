import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

// Maps position codes to [x%, y%] on a top-down pitch (attacking upward = low y)
const POSITION_COORDS: Record<string, [number, number]> = {
  GK:  [50, 88],
  LB:  [15, 72], LWB: [12, 62],
  CB:  [50, 75], RCB: [72, 75], LCB: [28, 75],
  RB:  [85, 72], RWB: [88, 62],
  DM:  [50, 58], CDM: [50, 58],
  CM:  [35, 48], LCM: [28, 48], RCM: [72, 48],
  LM:  [12, 42], RM:  [88, 42],
  AM:  [50, 35], CAM: [50, 35],
  LW:  [15, 22], RW:  [85, 22],
  SS:  [35, 20],
  CF:  [50, 12], ST:  [50, 12],
  FW:  [50, 15],
};

function posToCoords(position: string): [number, number] {
  const upper = position.toUpperCase().trim();
  if (POSITION_COORDS[upper]) return POSITION_COORDS[upper];
  // Fuzzy fallback for compound codes like "M/F"
  for (const key of Object.keys(POSITION_COORDS)) {
    if (upper.includes(key)) return POSITION_COORDS[key];
  }
  return [50, 50]; // centre pitch fallback
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const mid = parseInt(matchId);
  if (isNaN(mid)) return NextResponse.json({ error: "Invalid match id" }, { status: 400 });

  const [matchRows, playerRows] = await Promise.all([
    sql`
      SELECT m.id, m.home_score, m.away_score, m.league,
             ht.id AS home_team_id, ht.name AS home_name,
             at.id AS away_team_id, at.name AS away_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${mid}
    `,
    sql`
      SELECT pr.id, pr.rating, pr.goals, pr.assists, pr.tackles,
             pr.pass_accuracy, pr.shots, pr.minutes_played,
             p.name, p.position, p.team_id,
             t.name AS team_name
      FROM player_ratings pr
      JOIN players p ON pr.player_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE pr.match_id = ${mid}
      ORDER BY pr.rating DESC
    `,
  ]);

  if (matchRows.length === 0) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const match = matchRows[0];

  type PlayerWithCoords = (typeof playerRows)[number] & { coords: [number, number] };

  const homePlayers: PlayerWithCoords[] = playerRows.filter((p) => p.team_id === match.home_team_id).map((p) => ({
    ...p,
    coords: posToCoords(p.position as string),
  }));
  const awayPlayers: PlayerWithCoords[] = playerRows.filter((p) => p.team_id === match.away_team_id).map((p) => ({
    ...p,
    coords: posToCoords(p.position as string),
  }));

  // Detect formation string from position distribution
  function detectFormation(players: PlayerWithCoords[]): string {
    const posMap = players.reduce((acc, p) => {
      const pos = (p.position as string).toUpperCase();
      const line = pos.includes("GK") ? "GK"
        : pos.includes("B") && !pos.includes("AM") ? "DEF"
        : pos.includes("M") ? "MID"
        : "FWD";
      acc[line] = (acc[line] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const def = posMap.DEF ?? 0;
    const mid = posMap.MID ?? 0;
    const fwd = posMap.FWD ?? 0;
    if (!def && !mid && !fwd) return "unknown";
    return `${def}-${mid}-${fwd}`;
  }

  const homeFormation = detectFormation(homePlayers);
  const awayFormation = detectFormation(awayPlayers);

  // Generate Claude tactical description
  let tacticalDescription = "";
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const prompt = `Match: ${match.home_name} (${homeFormation}) ${match.home_score}–${match.away_score} ${match.away_name} (${awayFormation})
Home top players: ${homePlayers.slice(0, 5).map((p) => `${p.name} (${p.position}, rating ${Number(p.rating).toFixed(1)})`).join(", ")}
Away top players: ${awayPlayers.slice(0, 5).map((p) => `${p.name} (${p.position}, rating ${Number(p.rating).toFixed(1)})`).join(", ")}

Give a concise 2-3 sentence tactical summary of how these formations likely matched up, what the key tactical battles were, and one specific observation about the formation structure.`;

      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 220,
        messages: [{ role: "user", content: prompt }],
      });
      tacticalDescription = (msg.content[0] as { text: string }).text;
    } catch {
      tacticalDescription = "";
    }
  }

  return NextResponse.json({
    matchId: mid,
    home: { id: match.home_team_id, name: match.home_name, formation: homeFormation, players: homePlayers },
    away: { id: match.away_team_id, name: match.away_name, formation: awayFormation, players: awayPlayers },
    tacticalDescription,
  });
}
