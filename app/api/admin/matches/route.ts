import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("x-admin-secret") === secret;
}

interface MatchInput {
  home_team_id: number;
  away_team_id: number;
  home_score?:  number;
  away_score?:  number;
  status?:      string;
  match_date?:  string;
  league?:      string;
  competition?: string;
  season?:      string;
  venue?:       string;
}

// POST /api/admin/matches — bulk create matches
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { matches: MatchInput[] } | MatchInput;
  const items: MatchInput[] = Array.isArray((body as { matches: MatchInput[] }).matches)
    ? (body as { matches: MatchInput[] }).matches
    : [body as MatchInput];

  await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS competition TEXT`;

  const created: number[] = [];
  const errors:  string[] = [];

  for (const m of items) {
    if (m.home_team_id === m.away_team_id) {
      errors.push(`Self-match skipped for team ${m.home_team_id}`);
      continue;
    }
    try {
      const [row] = await sql`
        INSERT INTO matches (
          home_team_id, away_team_id,
          home_score, away_score, status, match_date,
          league, competition, season, venue
        ) VALUES (
          ${m.home_team_id}, ${m.away_team_id},
          ${m.home_score ?? 0}, ${m.away_score ?? 0},
          ${m.status ?? "finished"},
          ${m.match_date ?? new Date().toISOString()},
          ${m.league ?? "FIFA World Cup 2026"},
          ${m.competition ?? "WC"},
          ${m.season ?? "2026"},
          ${m.venue ?? null}
        )
        RETURNING id
      `;
      created.push(row.id as number);
    } catch (e) {
      errors.push(`${m.home_team_id}v${m.away_team_id}: ${(e as Error).message.slice(0, 60)}`);
    }
  }

  return NextResponse.json({ ok: true, created: created.length, ids: created, errors });
}
