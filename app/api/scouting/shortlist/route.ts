import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// Ensure table exists
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS player_shortlists (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, player_id)
    )
  `;
}

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  await ensureTable();

  const rows = await sql`
    SELECT
      ps.id, ps.notes, ps.created_at,
      p.id AS player_id, p.name, p.position, p.age,
      t.name AS team_name,
      COUNT(pr.id)::int AS matches_played,
      ROUND(AVG(pr.rating)::numeric, 2) AS avg_rating,
      SUM(pr.goals)::int AS total_goals,
      SUM(pr.assists)::int AS total_assists,
      ROUND(AVG(pr.pass_accuracy)::numeric, 1) AS avg_pass_accuracy,
      SUM(pr.shots)::int AS total_shots,
      ROUND(AVG(pr.tackles)::numeric, 1) AS avg_tackles
    FROM player_shortlists ps
    JOIN players p ON ps.player_id = p.id
    JOIN teams t ON p.team_id = t.id
    LEFT JOIN player_ratings pr ON pr.player_id = p.id
    WHERE ps.user_id = ${session.userId}
    GROUP BY ps.id, ps.notes, ps.created_at, p.id, p.name, p.position, p.age, t.name
    ORDER BY ps.created_at DESC
  `;

  return NextResponse.json({ shortlist: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { playerId, notes = "" } = await req.json() as { playerId: number; notes?: string };
  if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

  await ensureTable();

  await sql`
    INSERT INTO player_shortlists (user_id, player_id, notes)
    VALUES (${session.userId}, ${playerId}, ${notes})
    ON CONFLICT (user_id, player_id) DO UPDATE SET notes = ${notes}
  `;

  return NextResponse.json({ ok: true });
}
