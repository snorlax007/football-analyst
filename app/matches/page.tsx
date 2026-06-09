import sql from "@/lib/db";
import MatchList from "./MatchList";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const rows = await sql`
    SELECT
      m.id, m.home_score, m.away_score, m.status, m.current_minute,
      m.match_date, m.league,
      ht.name AS home_name, ht.short_name AS home_short,
      at.name AS away_name, at.short_name AS away_short
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    ORDER BY
      CASE m.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
      m.match_date DESC
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
  }));

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black">Matches</h1>
            <p className="text-slate-500 text-sm mt-1">
              {liveCount > 0
                ? `${liveCount} match${liveCount > 1 ? "es" : ""} live now · scores update automatically`
                : "Click any match to view stats and AI analysis"}
            </p>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Live
            </div>
          )}
        </div>

        <MatchList initial={matches} />

        {matches.length > 0 && (
          <p className="text-center text-slate-600 text-xs mt-8">
            {matches.length} match{matches.length !== 1 ? "es" : ""}
          </p>
        )}
      </main>
    </div>
  );
}
