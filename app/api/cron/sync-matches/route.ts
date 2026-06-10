import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function auth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("x-cron-secret") === secret
      || req.headers.get("x-admin-secret") === secret;
}

const API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";
const BASE    = "https://api.football-data.org/v4";

// Competitions available on free tier that are WC2026-relevant
const WC_COMPETITIONS = [
  "WC",   // FIFA World Cup 2026 (starts June 11)
  "UNL",  // UEFA Nations League
  "EC",   // UEFA European Championship qualifiers
  "CLI",  // Copa Libertadores (not WC but big international)
];

interface FDTeam { id: number; name: string; shortName: string; tla: string; }
interface FDScore { fullTime: { home: number | null; away: number | null }; }
interface FDMatch {
  id:          number;
  utcDate:     string;
  status:      string;
  competition: { id: number; name: string; code: string };
  homeTeam:    FDTeam;
  awayTeam:    FDTeam;
  score:       FDScore;
  venue?:      string;
}

async function fd(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": API_KEY },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ matches: FDMatch[] }>;
}

async function ensureTeam(fdTeam: FDTeam): Promise<number> {
  // Match by short_name (tla) — safest cross-reference
  const existing = await sql`SELECT id FROM teams WHERE short_name = ${fdTeam.tla} LIMIT 1`;
  if (existing.length > 0) return existing[0].id as number;

  // Insert new team
  const [row] = await sql`
    INSERT INTO teams (name, short_name)
    VALUES (${fdTeam.name}, ${fdTeam.tla})
    RETURNING id
  `;
  return row.id as number;
}

function fdStatusToLocal(status: string): string {
  if (status === "FINISHED")  return "finished";
  if (status === "LIVE" || status === "IN_PLAY" || status === "PAUSED") return "live";
  return "scheduled";
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!API_KEY) {
    return NextResponse.json({
      ok: false,
      error: "FOOTBALL_DATA_API_KEY not configured",
      setup: "Add FOOTBALL_DATA_API_KEY to Vercel environment variables. Get a free key at https://www.football-data.org/",
    }, { status: 503 });
  }

  // Ensure external_id columns exist for deduplication
  await sql`ALTER TABLE teams   ADD COLUMN IF NOT EXISTS external_id INT UNIQUE`;
  await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS external_id INT UNIQUE`;
  await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS competition  TEXT`;

  const toDate   = new Date();
  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const upserted: string[] = [];
  const errors:   string[] = [];

  // Fetch per competition (free tier doesn't allow multiple competitions in one call)
  for (const comp of WC_COMPETITIONS) {
    try {
      const { matches } = await fd(
        `/matches?dateFrom=${fmt(fromDate)}&dateTo=${fmt(toDate)}&competitions=${comp}`
      );

      for (const m of matches) {
        try {
          const homeId = await ensureTeam(m.homeTeam);
          const awayId = await ensureTeam(m.awayTeam);

          const status    = fdStatusToLocal(m.status);
          const homeScore = m.score.fullTime.home ?? 0;
          const awayScore = m.score.fullTime.away ?? 0;
          const matchDate = new Date(m.utcDate).toISOString();
          const label     = `${m.homeTeam.tla} vs ${m.awayTeam.tla}`;

          await sql`
            INSERT INTO matches (
              home_team_id, away_team_id, home_score, away_score,
              status, match_date, league, season, competition, external_id
            ) VALUES (
              ${homeId}, ${awayId}, ${homeScore}, ${awayScore},
              ${status}, ${matchDate},
              ${m.competition.name}, ${"2026"},
              ${m.competition.code}, ${m.id}
            )
            ON CONFLICT (external_id) DO UPDATE SET
              home_score  = EXCLUDED.home_score,
              away_score  = EXCLUDED.away_score,
              status      = EXCLUDED.status,
              match_date  = EXCLUDED.match_date
          `;
          upserted.push(label);
        } catch (e) {
          errors.push(`${m.id}: ${(e as Error).message.slice(0, 60)}`);
        }
      }

      // Respect rate limit: 10 calls/min free tier
      await new Promise((r) => setTimeout(r, 7000));
    } catch (e) {
      errors.push(`${comp}: ${(e as Error).message.slice(0, 80)}`);
    }
  }

  return NextResponse.json({
    ok:      true,
    synced:  upserted.length,
    errors:  errors.length,
    matches: upserted,
    errorList: errors,
    range:   `${fmt(fromDate)} → ${fmt(toDate)}`,
  });
}
