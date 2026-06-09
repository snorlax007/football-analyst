"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { MatchDetail } from "@/lib/types";

const FormationViz = dynamic(() => import("./FormationViz"), { ssr: false });

function StatBar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-2">
        <span className="text-slate-300">{label}</span>
        <span className="text-emerald-400 font-bold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className ?? ""}`} />;
}

export default function MatchClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/matches/${id}`)
      .then((r) => r.json())
      .then((data: MatchDetail) => {
        setMatch(data);
        if (data.analysis?.insights) setInsights(data.analysis.insights);
      })
      .catch(() => setError("Could not load match data."))
      .finally(() => setLoading(false));
  }, [id]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/report/${id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `match-report-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setQueued(false);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) throw new Error("Please sign in to generate analysis");
        if (res.status === 403) throw new Error(data.error);
        throw new Error(data.error ?? "Analysis failed");
      }
      // Background job queued — poll until analysis appears
      if (data.status === "queued") {
        setQueued(true);
        if (data.remaining !== undefined) setRemaining(data.remaining);
        const poll = setInterval(async () => {
          try {
            const r = await fetch(`/api/matches/${id}`);
            const d = await r.json();
            if (d.analysis?.insights?.length) {
              setInsights(d.analysis.insights);
              setQueued(false);
              clearInterval(poll);
            }
          } catch { /* keep polling */ }
        }, 3000);
        setTimeout(() => clearInterval(poll), 120_000); // stop after 2 min
        return;
      }
      setInsights(data.insights);
      if (data.remaining !== undefined) setRemaining(data.remaining);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  const hs = match?.home_stats;
  const as_ = match?.away_stats;
  const statusLabel: Record<string, string> = { finished: "Full Time", live: "Live", scheduled: "Upcoming" };

  const stats = hs
    ? [
        { label: "Possession", value: `${hs.possession}%`, pct: Number(hs.possession) },
        { label: "Pass Accuracy", value: `${hs.pass_accuracy}%`, pct: Number(hs.pass_accuracy) },
        { label: "Expected Goals (xG)", value: String(hs.xg), pct: (Number(hs.xg) / 4) * 100 },
        { label: "Pressing Intensity", value: `${hs.press_intensity}%`, pct: Number(hs.press_intensity) },
        { label: "Shots on Target", value: `${hs.shots_on_target} / ${hs.shots}`, pct: hs.shots ? (hs.shots_on_target / hs.shots) * 100 : 0 },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/matches" className="text-slate-500 hover:text-white text-sm transition-colors">
            ← Matches
          </Link>
          {match && (
            <span className="text-slate-700 text-xs">/ {match.league}</span>
          )}
          {match?.status === "live" && (
            <Link
              href={`/live/${id}`}
              className="ml-auto flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 px-3 py-1 rounded-full font-semibold transition"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Live tracker
            </Link>
          )}
        </div>

        {/* Match Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-5 sm:p-8">
          {loading ? (
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-14 w-32" />
              <Skeleton className="h-8 w-40" />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="text-center flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">Home</p>
                <h2 className="text-base sm:text-xl md:text-3xl font-bold leading-tight">{match?.home_team.name}</h2>
                {hs && <p className="text-xs text-slate-500 mt-1">xG {hs.xg}</p>}
              </div>
              <div className="text-center flex-shrink-0 px-2">
                <p className="text-4xl sm:text-5xl md:text-6xl font-black text-emerald-400 tabular-nums leading-none">
                  {match?.home_score}–{match?.away_score}
                </p>
                <span className="mt-3 inline-block text-[10px] bg-slate-700/80 text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest font-semibold">
                  {statusLabel[match?.status ?? ""] ?? match?.status}
                </span>
              </div>
              <div className="text-center flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">Away</p>
                <h2 className="text-base sm:text-xl md:text-3xl font-bold leading-tight">{match?.away_team.name}</h2>
                {as_ && <p className="text-xs text-slate-500 mt-1">xG {as_.xg}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Formation Visualizer */}
        <FormationViz matchId={id} />

        {/* Stats + Players */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
            <h3 className="text-emerald-400 font-semibold text-base mb-1">📊 Team Statistics</h3>
            {match && <p className="text-slate-500 text-xs mb-5">{match.home_team.name}</p>}
            {loading ? (
              <div className="space-y-5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <div className="space-y-5">{stats.map((s) => <StatBar key={s.label} {...s} />)}</div>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
            <h3 className="text-emerald-400 font-semibold text-base mb-6">⭐ Top Player Ratings</h3>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="space-y-3">
                {(match?.players ?? []).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-colors rounded-xl px-4 py-3 group">
                    <span className="text-slate-600 text-xs font-mono w-4 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{p.position} · {p.team_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-emerald-400 tabular-nums">{Number(p.rating).toFixed(1)}</span>
                      {(p.goals > 0 || p.assists > 0) && (
                        <p className="text-[10px] text-slate-500">{p.goals > 0 ? `${p.goals}G` : ""}{p.assists > 0 ? ` ${p.assists}A` : ""}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Comparison */}
        {!loading && hs && as_ && (
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
            <h3 className="text-emerald-400 font-semibold text-base mb-5">⚡ Key Stats Comparison</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              {[
                { label: "xG", home: hs.xg, away: as_.xg },
                { label: "Shots", home: hs.shots, away: as_.shots },
                { label: "On Target", home: hs.shots_on_target, away: as_.shots_on_target },
                { label: "Corners", home: hs.corners, away: as_.corners },
                { label: "Fouls", home: hs.fouls, away: as_.fouls },
                { label: "Possession", home: `${hs.possession}%`, away: `${as_.possession}%` },
              ].map(({ label, home, away }) => (
                <div key={label} className="bg-white/5 rounded-xl p-3 min-h-[44px]">
                  <p className="text-slate-500 text-xs mb-2">{label}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-400">{home}</span>
                    <span className="text-slate-600 text-xs">vs</span>
                    <span className="font-bold text-slate-300">{away}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>{match?.home_team.short_name}</span>
                    <span>{match?.away_team.short_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
          <h3 className="text-emerald-400 font-semibold text-base mb-1">🤖 AI Tactical Analysis</h3>
          <p className="text-slate-500 text-xs mb-5">
            Powered by Claude · Real match data
            {remaining !== null && (
              <span className="ml-2 text-slate-600">· {remaining} free report{remaining !== 1 ? "s" : ""} remaining</span>
            )}
          </p>

          <div className="space-y-3 min-h-28">
            {analyzing ? (
              <div className="flex items-center gap-3 text-slate-400 py-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="animate-pulse text-sm">Claude is analyzing match events…</span>
              </div>
            ) : queued ? (
              <div className="flex items-center gap-3 text-slate-400 py-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
                <span className="animate-pulse text-sm">Analysis queued — generating in background… You&apos;ll get a push notification when it&apos;s ready.</span>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
                {error.includes("log in") && (
                  <Link href="/login" className="ml-2 underline hover:text-red-300">Sign in →</Link>
                )}
              </div>
            ) : insights.length > 0 ? (
              insights.map((text, i) => (
                <div key={i} className="flex gap-3 bg-white/5 rounded-xl px-4 py-3 border-l-2 border-emerald-500/60">
                  <span className="text-emerald-500 text-lg leading-none mt-0.5 flex-shrink-0">›</span>
                  <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm py-4">Click below to generate AI tactical analysis for this match.</p>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={runAnalysis}
              disabled={analyzing || queued || loading}
              className="flex-1 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold text-sm tracking-wide transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {analyzing ? "Analyzing…" : queued ? "Queued…" : "Generate New AI Analysis"}
            </button>
            <button
              onClick={downloadPdf}
              disabled={downloading || loading}
              title="Download PDF (Pro+)"
              className="sm:w-40 py-4 rounded-xl border border-white/20 hover:border-white/40 text-slate-300 hover:text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {downloading ? "…" : "⬇ PDF Report"}
            </button>
          </div>
        </div>

        {/* Share */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-400">Share this analysis</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Twitter / X", href: `https://x.com/intent/tweet?text=${encodeURIComponent(`${match?.home_team.name ?? ""} vs ${match?.away_team.name ?? ""} — AI Match Analysis`)}&url=${encodeURIComponent(typeof window !== "undefined" ? `/share/${id}` : "")}`, icon: "𝕏", bg: "bg-black border border-white/20" },
              { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${match?.home_team.name ?? ""} vs ${match?.away_team.name ?? ""} AI Analysis: /share/${id}`)}`, icon: "💬", bg: "bg-green-700" },
            ].map(({ label, href, icon, bg }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-90 ${bg}`}>
                <span>{icon}</span>{label}
              </a>
            ))}
            <Link href={`/share/${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 text-slate-300 hover:border-white/40 hover:text-white transition">
              🔗 Public link
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
