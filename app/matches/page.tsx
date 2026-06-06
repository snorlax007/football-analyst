import Link from "next/link";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const matches = await sql`
    SELECT
      m.id, m.home_score, m.away_score, m.status,
      m.match_date, m.league, m.season, m.venue,
      ht.name AS home_name, ht.short_name AS home_short,
      at.name AS away_name, at.short_name AS away_short
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    ORDER BY m.match_date DESC
  `;

  const statusLabel: Record<string, string> = {
    finished: "FT",
    live: "Live",
    scheduled: "vs",
  };

  const statusColor: Record<string, string> = {
    finished: "bg-slate-700 text-slate-400",
    live: "bg-emerald-500/20 text-emerald-400 animate-pulse",
    scheduled: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-black">Matches</h1>
          <p className="text-slate-500 text-sm mt-1">Click any match to view stats and run AI analysis</p>
        </div>

        <div className="space-y-3">
          {matches.length === 0 && (
            <p className="text-slate-500 text-center py-12">No matches available yet.</p>
          )}
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/matches/${m.id}`}
              className="flex items-center justify-between rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/20 px-6 py-5 transition-all group"
            >
              <div className="flex-1 text-right">
                <p className="font-bold text-base group-hover:text-emerald-400 transition-colors">{m.home_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.home_short}</p>
              </div>

              <div className="mx-6 text-center flex-shrink-0">
                {m.status === "scheduled" ? (
                  <p className="text-xl font-black text-slate-400">–</p>
                ) : (
                  <p className="text-xl font-black text-emerald-400 tabular-nums">
                    {m.home_score} – {m.away_score}
                  </p>
                )}
                <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-widest ${statusColor[m.status] ?? statusColor.finished}`}>
                  {statusLabel[m.status] ?? m.status}
                </span>
              </div>

              <div className="flex-1 text-left">
                <p className="font-bold text-base">{m.away_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.away_short}</p>
              </div>
            </Link>
          ))}
        </div>

        {matches.length > 0 && (
          <p className="text-center text-slate-600 text-xs mt-8">
            {matches.length} match{matches.length !== 1 ? "es" : ""}
          </p>
        )}
      </main>
    </div>
  );
}
