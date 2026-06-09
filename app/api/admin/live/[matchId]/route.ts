import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function auth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev — allow freely
  return req.headers.get("x-admin-secret") === secret;
}

async function ensureTables() {
  await sql`
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_minute INT DEFAULT NULL
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS live_events (
      id          SERIAL PRIMARY KEY,
      match_id    INT NOT NULL,
      type        TEXT NOT NULL,
      minute      INT,
      player_name TEXT,
      team_id     INT,
      description TEXT,
      ai_comment  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// POST /api/admin/live/[matchId]  — inject a live event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const id = parseInt(matchId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });

  const body = (await req.json()) as {
    type: string;
    minute?: number;
    player_name?: string;
    team_id?: number;
    description?: string;
  };

  if (!body.type) return NextResponse.json({ error: "type is required" }, { status: 400 });

  await ensureTables();

  const [event] = await sql`
    INSERT INTO live_events (match_id, type, minute, player_name, team_id, description)
    VALUES (
      ${id},
      ${body.type},
      ${body.minute ?? null},
      ${body.player_name ?? null},
      ${body.team_id ?? null},
      ${body.description ?? null}
    )
    RETURNING *
  `;

  // Auto-update match score on goal
  if (body.type === "goal" && body.team_id) {
    const matches = await sql`
      SELECT home_team_id, away_team_id, home_score, away_score FROM matches WHERE id = ${id}
    `;
    if (matches.length > 0) {
      const m = matches[0];
      if (m.home_team_id === body.team_id) {
        await sql`UPDATE matches SET home_score = home_score + 1 WHERE id = ${id}`;
      } else if (m.away_team_id === body.team_id) {
        await sql`UPDATE matches SET away_score = away_score + 1 WHERE id = ${id}`;
      }
    }
  }

  // Auto-update score on own_goal (opposite team scores)
  if (body.type === "own_goal" && body.team_id) {
    const matches = await sql`
      SELECT home_team_id, away_team_id FROM matches WHERE id = ${id}
    `;
    if (matches.length > 0) {
      const m = matches[0];
      // own goal by home team → away team scores
      if (m.home_team_id === body.team_id) {
        await sql`UPDATE matches SET away_score = away_score + 1 WHERE id = ${id}`;
      } else if (m.away_team_id === body.team_id) {
        await sql`UPDATE matches SET home_score = home_score + 1 WHERE id = ${id}`;
      }
    }
  }

  return NextResponse.json({ ok: true, event });
}

// PATCH /api/admin/live/[matchId]  — update match state (status, score, minute, stats)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const id = parseInt(matchId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });

  const body = (await req.json()) as {
    status?: "scheduled" | "live" | "finished";
    home_score?: number;
    away_score?: number;
    current_minute?: number | null;
    stats?: {
      team_id: number;
      possession?: number;
      shots?: number;
      shots_on_target?: number;
      pass_accuracy?: number;
      passes?: number;
      fouls?: number;
      corners?: number;
      yellow_cards?: number;
      red_cards?: number;
      offsides?: number;
      xg?: number;
      press_intensity?: number;
    }[];
  };

  await ensureTables();

  const updates: string[] = [];

  if (body.status !== undefined) {
    await sql`UPDATE matches SET status = ${body.status} WHERE id = ${id}`;
    updates.push("status");
  }
  if (body.home_score !== undefined) {
    await sql`UPDATE matches SET home_score = ${body.home_score} WHERE id = ${id}`;
    updates.push("home_score");
  }
  if (body.away_score !== undefined) {
    await sql`UPDATE matches SET away_score = ${body.away_score} WHERE id = ${id}`;
    updates.push("away_score");
  }
  if (body.current_minute !== undefined) {
    await sql`UPDATE matches SET current_minute = ${body.current_minute} WHERE id = ${id}`;
    updates.push("current_minute");
  }

  if (body.stats?.length) {
    for (const s of body.stats) {
      await sql`
        INSERT INTO match_stats (
          match_id, team_id, possession, shots, shots_on_target,
          pass_accuracy, passes, fouls, corners, yellow_cards,
          red_cards, offsides, xg, press_intensity
        ) VALUES (
          ${id}, ${s.team_id},
          ${s.possession ?? 50}, ${s.shots ?? 0}, ${s.shots_on_target ?? 0},
          ${s.pass_accuracy ?? 0}, ${s.passes ?? 0}, ${s.fouls ?? 0},
          ${s.corners ?? 0}, ${s.yellow_cards ?? 0}, ${s.red_cards ?? 0},
          ${s.offsides ?? 0}, ${s.xg ?? 0}, ${s.press_intensity ?? 0}
        )
        ON CONFLICT (match_id, team_id) DO UPDATE SET
          possession       = EXCLUDED.possession,
          shots            = EXCLUDED.shots,
          shots_on_target  = EXCLUDED.shots_on_target,
          pass_accuracy    = EXCLUDED.pass_accuracy,
          passes           = EXCLUDED.passes,
          fouls            = EXCLUDED.fouls,
          corners          = EXCLUDED.corners,
          yellow_cards     = EXCLUDED.yellow_cards,
          red_cards        = EXCLUDED.red_cards,
          offsides         = EXCLUDED.offsides,
          xg               = EXCLUDED.xg,
          press_intensity  = EXCLUDED.press_intensity
      `;
    }
    updates.push("stats");
  }

  return NextResponse.json({ ok: true, updated: updates });
}
