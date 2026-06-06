import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import UsageBar from "@/components/UsageBar";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const month = new Date().toISOString().slice(0, 7);
  const [usageRows, recentAnalyses] = await Promise.all([
    sql`
      SELECT reports_generated FROM user_usage
      WHERE user_id = ${session.userId} AND month = ${month}
    `,
    sql`
      SELECT a.created_at, a.model,
             m.id AS match_id, m.home_score, m.away_score, m.league,
             ht.name AS home_name, at.name AS away_name
      FROM ai_analyses a
      JOIN matches m ON a.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      ORDER BY a.created_at DESC
      LIMIT 5
    `,
  ]);

  const used = usageRows.length > 0 ? Number(usageRows[0].reports_generated) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">

        <div>
          <h1 className="text-2xl font-black">
            Welcome back, {session.name.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">{session.email}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
            <p className="text-3xl font-black text-emerald-400">{used}</p>
            <p className="text-xs text-slate-500 mt-1">Reports this month</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
            <p className="text-3xl font-black text-white">{recentAnalyses.length}</p>
            <p className="text-xs text-slate-500 mt-1">Total analyses</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
            <p className="text-3xl font-black text-emerald-400">Free</p>
            <p className="text-xs text-slate-500 mt-1">Current plan</p>
          </div>
        </div>

        <UsageBar />

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">Recent Analyses</h2>
            <Link href="/matches" className="text-xs text-emerald-400 hover:text-emerald-300">
              Browse matches →
            </Link>
          </div>

          {recentAnalyses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm mb-3">No analyses yet.</p>
              <Link
                href="/matches"
                className="inline-block bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Analyze your first match
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnalyses.map((a, i) => (
                <Link
                  key={i}
                  href={`/matches/${a.match_id}`}
                  className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {a.home_name} {a.home_score}–{a.away_score} {a.away_name}
                    </p>
                    <p className="text-xs text-slate-500">{a.league}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-emerald-400 group-hover:text-emerald-300 transition-colors mt-0.5">
                      View →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
