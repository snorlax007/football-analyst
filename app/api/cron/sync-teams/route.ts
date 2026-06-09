import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

// Called by a cron job (Vercel cron / GitHub Actions) to sync latest matches
// for all followed teams. Requires CRON_SECRET header for security.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const followedTeams = await sql`
    SELECT DISTINCT t.id, t.name
    FROM followed_teams ft
    JOIN teams t ON ft.team_id = t.id
    ORDER BY t.name ASC
  `;

  // In production this would call an external football API (e.g. api-football.com)
  // to fetch and store the latest matches for each team.
  // For now, log and return the list of teams to sync.

  await sql`
    INSERT INTO logs (message)
    VALUES (${`Cron: sync-teams triggered for ${followedTeams.length} teams: ${followedTeams.map((t) => t.name).join(", ") || "none"}`})
  `;

  return NextResponse.json({
    ok: true,
    teamsToSync: followedTeams.length,
    teams: followedTeams,
    note: "Connect API_FOOTBALL_KEY to fetch live data",
  });
}
