import sql from "@/lib/db";
import MatchesShell from "./MatchesShell";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  // Add competition column if not yet present (migration-safe)
  try {
    await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS competition TEXT`;
  } catch {}

  const rows = await sql`
    SELECT
      m.id, m.home_score, m.away_score, m.status, m.current_minute,
      m.match_date, m.league, m.competition,
      ht.name AS home_name, ht.short_name AS home_short,
      at.name AS away_name, at.short_name AS away_short
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    ORDER BY
      CASE m.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
      m.match_date DESC
    LIMIT 200
  `;

  const matches = rows.map((m) => ({
    id:            m.id as number,
    homeScore:     m.home_score as number | null,
    awayScore:     m.away_score as number | null,
    status:        m.status as string,
    currentMinute: (m.current_minute ?? null) as number | null,
    homeName:      m.home_name as string,
    homeShort:     m.home_short as string,
    awayName:      m.away_name as string,
    awayShort:     m.away_short as string,
    matchDate:     m.match_date as string,
    league:        (m.league ?? null) as string | null,
    competition:   (m.competition ?? null) as string | null,
  }));

  // Build competition filter options from actual data
  const compSet = new Set(matches.map((m) => m.competition ?? m.league ?? "Other").filter(Boolean));
  const competitions = Array.from(compSet);

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <MatchesShell
      matches={matches}
      competitions={competitions}
      liveCount={liveCount}
    />
  );
}
