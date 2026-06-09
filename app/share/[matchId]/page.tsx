import type { Metadata } from "next";
import Link from "next/link";
import sql from "@/lib/db";
import { notFound } from "next/navigation";
import ShareButtons from "./ShareButtons";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ matchId: string }> }
): Promise<Metadata> {
  const { matchId } = await params;
  const id = parseInt(matchId);
  if (isNaN(id)) return { title: "Match Report" };

  const rows = await sql`
    SELECT m.home_score, m.away_score, m.league,
           ht.name AS home_name, at.name AS away_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.id = ${id}
  `;
  if (rows.length === 0) return { title: "Match Report" };

  const m = rows[0];
  const title = `${m.home_name} ${m.home_score}–${m.away_score} ${m.away_name} | AI Match Report`;
  const description = `AI-powered tactical analysis of ${m.home_name} vs ${m.away_name}. ${m.league ?? "Premier League"} match report.`;
  const ogImage = `/api/og/match/${id}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [ogImage], type: "article" },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const id = parseInt(matchId);
  if (isNaN(id)) notFound();

  const [matches, stats, players, analyses] = await Promise.all([
    sql`
      SELECT m.*, ht.name AS home_name, ht.short_name AS home_short,
             at.name AS away_name, at.short_name AS away_short
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${id}
    `,
    sql`
      SELECT ms.*, t.name AS team_name
      FROM match_stats ms JOIN teams t ON ms.team_id = t.id
      WHERE ms.match_id = ${id}
    `,
    sql`
      SELECT pr.*, p.name, p.position, t.name AS team_name
      FROM player_ratings pr
      JOIN players p ON pr.player_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE pr.match_id = ${id}
      ORDER BY pr.rating DESC LIMIT 6
    `,
    sql`SELECT insights FROM ai_analyses WHERE match_id = ${id} ORDER BY created_at DESC LIMIT 1`,
  ]);

  if (matches.length === 0) notFound();

  const match = matches[0];
  const hs = stats.find((s) => s.team_id === match.home_team_id);
  const as_ = stats.find((s) => s.team_id === match.away_team_id);
  const insights: string[] = analyses.length > 0
    ? (Array.isArray(analyses[0].insights) ? analyses[0].insights : JSON.parse(analyses[0].insights as string))
    : [];

  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://football-analyst.vercel.app"}/share/${id}`;
  const shareTitle = `${match.home_name} ${match.home_score}–${match.away_score} ${match.away_name} — AI Match Analysis`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.home_name} vs ${match.away_name}`,
    sport: "Soccer",
    homeTeam: { "@type": "SportsTeam", name: match.home_name },
    awayTeam: { "@type": "SportsTeam", name: match.away_name },
    description: `AI tactical analysis: ${match.home_name} ${match.home_score}–${match.away_score} ${match.away_name}`,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        {/* Brand bar */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-emerald-400 font-bold text-sm hover:text-emerald-300 transition">
            <span>⚽</span> Football AI Analyst
          </Link>
          <Link href={`/matches/${id}`} className="text-xs text-slate-500 hover:text-white transition">
            Full analysis →
          </Link>
        </div>

        {/* Score card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
          <p className="text-xs text-slate-500 text-center mb-4">{match.league ?? "Premier League"}</p>
          <div className="flex items-center justify-between gap-4">
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Home</p>
              <h2 className="text-2xl font-bold">{match.home_name}</h2>
              {hs && <p className="text-xs text-slate-500 mt-1">xG {hs.xg}</p>}
            </div>
            <div className="text-center">
              <p className="text-5xl font-black text-emerald-400">{match.home_score} – {match.away_score}</p>
              <span className="text-[10px] bg-slate-700/80 text-slate-400 px-3 py-0.5 rounded-full uppercase tracking-widest font-semibold mt-2 inline-block">
                {match.status === "finished" ? "Full Time" : match.status}
              </span>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Away</p>
              <h2 className="text-2xl font-bold">{match.away_name}</h2>
              {as_ && <p className="text-xs text-slate-500 mt-1">xG {as_.xg}</p>}
            </div>
          </div>
        </div>

        {/* Stats comparison */}
        {hs && as_ && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 className="text-emerald-400 font-semibold text-sm mb-4 uppercase tracking-wide">Key Stats</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "xG", home: hs.xg, away: as_.xg },
                { label: "Shots", home: hs.shots, away: as_.shots },
                { label: "Possession", home: `${hs.possession}%`, away: `${as_.possession}%` },
                { label: "Pass Acc.", home: `${hs.pass_accuracy}%`, away: `${as_.pass_accuracy}%` },
                { label: "Corners", home: hs.corners, away: as_.corners },
                { label: "On Target", home: hs.shots_on_target, away: as_.shots_on_target },
              ].map(({ label, home, away }) => (
                <div key={label} className="bg-white/5 rounded-xl p-3">
                  <p className="text-slate-500 text-xs mb-1">{label}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-400 text-sm">{home}</span>
                    <span className="text-slate-600 text-[10px]">–</span>
                    <span className="font-bold text-slate-300 text-sm">{away}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player ratings */}
        {players.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 className="text-emerald-400 font-semibold text-sm mb-4 uppercase tracking-wide">Top Ratings</h3>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={String(p.id)} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5">
                  <span className="text-slate-600 text-xs w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{String(p.name)}</p>
                    <p className="text-[10px] text-slate-500">{String(p.position)} · {String(p.team_name)}</p>
                  </div>
                  <span className="text-lg font-black text-emerald-400">{Number(p.rating).toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {insights.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 className="text-emerald-400 font-semibold text-sm mb-4 uppercase tracking-wide">AI Tactical Analysis</h3>
            <div className="space-y-3">
              {insights.map((text, i) => (
                <div key={i} className="flex gap-3 bg-white/5 rounded-xl px-4 py-3 border-l-2 border-emerald-500/60">
                  <span className="text-emerald-500 text-lg leading-none mt-0.5">›</span>
                  <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share buttons */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-sm font-semibold mb-4">Share this analysis</h3>
          <ShareButtons url={shareUrl} title={shareTitle} />
        </div>

        {/* CTA */}
        <div className="text-center py-6 border-t border-white/10">
          <p className="text-slate-400 text-sm mb-4">Get AI tactical analysis for every match</p>
          <Link
            href="/register"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-3 rounded-xl transition text-sm"
          >
            Start free — 5 analyses/month
          </Link>
        </div>
      </main>
    </div>
  );
}
