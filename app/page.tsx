"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { MatchDetail } from "@/lib/types";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=1920&q=80";

const DEFAULT_MATCH_ID = 1;

const WC_NATIONS = [
  "🇧🇷 Brazil","🇦🇷 Argentina","🇫🇷 France","🇩🇪 Germany","🇪🇸 Spain",
  "🇬🇧 England","🇵🇹 Portugal","🇮🇹 Italy","🇳🇱 Netherlands","🇺🇸 USA",
  "🇲🇽 Mexico","🇯🇵 Japan","🇲🇦 Morocco","🇸🇳 Senegal","🇦🇺 Australia",
];

function StatBar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-2">
        <span className="text-slate-300">{label}</span>
        <span className="font-bold tabular-nums text-[#f0b429]">{value}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: "linear-gradient(90deg, #c97c1a, #f0b429, #ffd970)",
          }}
        />
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg ${className ?? ""}`}
         style={{ background: "rgba(240,180,41,0.06)" }} />
  );
}

function InsightCard({ text, i }: { text: string; i: number }) {
  return (
    <div
      className="flex gap-3 rounded-xl px-4 py-3 border-l-2 animate-slide-up"
      style={{
        background: "rgba(240,180,41,0.05)",
        borderLeftColor: "#f0b429",
        animationDelay: `${i * 80}ms`,
      }}
    >
      <span className="text-[#f0b429] text-lg leading-none mt-0.5 flex-shrink-0">›</span>
      <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

export default function Home() {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scorePopped, setScorePopped] = useState(false);

  useEffect(() => {
    fetch(`/api/matches/${DEFAULT_MATCH_ID}`)
      .then((r) => r.json())
      .then((data: MatchDetail) => {
        setMatch(data);
        if (data.analysis?.insights) setInsights(data.analysis.insights);
        setTimeout(() => setScorePopped(true), 400);
      })
      .catch(() => setError("Could not load match data."))
      .finally(() => setLoading(false));
  }, []);

  async function runAnalysis() {
    setAnalyzing(true);
    setError(null);
    setInsights([]);
    try {
      const res = await fetch(`/api/analysis/${DEFAULT_MATCH_ID}`, { method: "POST" });
      const data = await res.json() as { insights?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setInsights(data.insights ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  const hs = match?.home_stats;
  const as_ = match?.away_stats;

  const stats = hs
    ? [
        { label: "Possession",          value: `${hs.possession}%`,           pct: Number(hs.possession) },
        { label: "Pass Accuracy",        value: `${hs.pass_accuracy}%`,        pct: Number(hs.pass_accuracy) },
        { label: "Expected Goals (xG)",  value: String(hs.xg),                 pct: (Number(hs.xg) / 4) * 100 },
        { label: "Pressing Intensity",   value: `${hs.press_intensity}%`,      pct: Number(hs.press_intensity) },
        { label: "Shots on Target",      value: `${hs.shots_on_target}/${hs.shots}`, pct: hs.shots ? (hs.shots_on_target / hs.shots) * 100 : 0 },
      ]
    : [];

  const statusLabel: Record<string, string> = {
    finished: "Full Time", live: "Live", scheduled: "Upcoming",
  };

  return (
    <div className="min-h-screen text-white">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative h-80 sm:h-96 overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt="World Cup stadium"
          fill
          className="object-cover object-center scale-105"
          priority
        />
        {/* layered overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06080f]/20 via-[#06080f]/55 to-[#06080f]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06080f]/40 via-transparent to-[#06080f]/40" />

        {/* decorative floodlights */}
        <div className="floodlight left-[15%]" style={{ animationDelay: "0s" }} />
        <div className="floodlight left-[50%]" style={{ animationDelay: "3s" }} />
        <div className="floodlight left-[85%]" style={{ animationDelay: "1.5s" }} />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 gap-4">

          {/* WC badge */}
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-widest uppercase"
               style={{
                 background: "rgba(240,180,41,0.1)",
                 borderColor: "rgba(240,180,41,0.35)",
                 color: "#f0b429",
               }}>
            <span className="text-base">🏆</span>
            FIFA World Cup 2026 · AI Analysis
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight drop-shadow-2xl leading-none">
            <span className="wc-gold-text">Football AI</span>
            <br />
            <span className="text-white">Match Analyst</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-md">
            Tactical intelligence & performance analysis — built for the world&apos;s biggest tournament
          </p>

          <div className="flex items-center gap-3 mt-1">
            <Link
              href="/matches"
              className="shimmer-parent relative overflow-hidden text-[#07090f] font-black text-sm px-6 py-2.5 rounded-xl transition-all"
              style={{ background: "linear-gradient(135deg, #f0b429, #ffd970)" }}
            >
              View Matches
            </Link>
            <Link
              href="/register"
              className="text-[#f0b429] font-semibold text-sm px-6 py-2.5 rounded-xl border transition-all hover:bg-[#f0b429]/10"
              style={{ borderColor: "rgba(240,180,41,0.35)" }}
            >
              Get started free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Nation ticker ────────────────────────────────────────── */}
      <div className="overflow-hidden border-y py-2" style={{ borderColor: "rgba(240,180,41,0.12)", background: "rgba(240,180,41,0.04)" }}>
        <div className="flex whitespace-nowrap animate-ticker">
          {[...WC_NATIONS, ...WC_NATIONS].map((n, i) => (
            <span key={i} className="px-6 text-sm" style={{ color: "rgba(240,180,41,0.55)" }}>{n}</span>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {match && (
          <p className="text-center text-xs tracking-widest uppercase" style={{ color: "rgba(240,180,41,0.4)" }}>
            {match.league} · {match.venue}
          </p>
        )}

        {/* ── Match scoreboard ─────────────────────────────────── */}
        <div className="wc-card wc-card-hover rounded-2xl p-8 shimmer-parent relative overflow-hidden pitch-lines-bg">
          {loading ? (
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-16 w-36" />
              <Skeleton className="h-8 w-40" />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="text-center flex-1">
                <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: "rgba(240,180,41,0.5)" }}>Home</p>
                <h2 className="text-xl md:text-3xl font-bold">{match?.home_team.name}</h2>
                {hs && <p className="text-xs text-slate-500 mt-1">xG {hs.xg}</p>}
              </div>

              <div className="text-center flex-shrink-0">
                <p
                  className={`text-5xl md:text-7xl font-black tabular-nums leading-none transition-transform duration-300 ${scorePopped ? "animate-score-pop" : "scale-90 opacity-0"}`}
                  style={{ color: "#f0b429", textShadow: "0 0 40px rgba(240,180,41,0.3)" }}
                >
                  {match?.home_score} – {match?.away_score}
                </p>
                <span
                  className="mt-3 inline-block text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-semibold"
                  style={{ background: "rgba(240,180,41,0.12)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.25)" }}
                >
                  {statusLabel[match?.status ?? ""] ?? match?.status}
                </span>
              </div>

              <div className="text-center flex-1">
                <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: "rgba(240,180,41,0.5)" }}>Away</p>
                <h2 className="text-xl md:text-3xl font-bold">{match?.away_team.name}</h2>
                {as_ && <p className="text-xs text-slate-500 mt-1">xG {as_.xg}</p>}
              </div>
            </div>
          )}
        </div>

        {/* ── Stats + Players ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="wc-card wc-card-hover rounded-2xl p-6">
            <h3 className="font-semibold text-base mb-1 flex items-center gap-2" style={{ color: "#f0b429" }}>
              <span>📊</span> Team Statistics
            </h3>
            {match && <p className="text-slate-500 text-xs mb-5">{match.home_team.name}</p>}
            {loading ? (
              <div className="space-y-5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <div className="space-y-5">{stats.map((s) => <StatBar key={s.label} {...s} />)}</div>
            )}
          </div>

          <div className="wc-card wc-card-hover rounded-2xl p-6">
            <h3 className="font-semibold text-base mb-5 flex items-center gap-2" style={{ color: "#f0b429" }}>
              <span>⭐</span> Top Player Ratings
            </h3>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="space-y-2">
                {(match?.players ?? []).map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-white/5 group"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-slate-600 text-xs font-mono w-4 text-center group-hover:text-slate-400 transition-colors">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{p.position} · {p.team_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black tabular-nums" style={{ color: "#f0b429" }}>
                        {Number(p.rating).toFixed(1)}
                      </span>
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

        {/* ── Head-to-head stats ────────────────────────────────── */}
        {!loading && hs && as_ && (
          <div className="wc-card wc-card-hover rounded-2xl p-6">
            <h3 className="font-semibold text-base mb-5 flex items-center gap-2" style={{ color: "#f0b429" }}>
              <span>⚡</span> Key Stats Comparison
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: "xG",         home: hs.xg,              away: as_.xg },
                { label: "Shots",      home: hs.shots,           away: as_.shots },
                { label: "On Target",  home: hs.shots_on_target, away: as_.shots_on_target },
                { label: "Corners",    home: hs.corners,         away: as_.corners },
                { label: "Fouls",      home: hs.fouls,           away: as_.fouls },
                { label: "Possession", home: `${hs.possession}%`,away: `${as_.possession}%` },
              ].map(({ label, home, away }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(240,180,41,0.05)", border: "1px solid rgba(240,180,41,0.1)" }}>
                  <p className="text-slate-500 text-[10px] mb-2 uppercase tracking-wide">{label}</p>
                  <div className="flex justify-between items-center gap-1">
                    <span className="font-bold text-sm" style={{ color: "#f0b429" }}>{home}</span>
                    <span className="text-slate-700 text-[10px]">vs</span>
                    <span className="font-bold text-sm text-slate-300">{away}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-700 mt-1">
                    <span>{match?.home_team.short_name}</span>
                    <span>{match?.away_team.short_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI Analysis ──────────────────────────────────────── */}
        <div className="wc-card wc-card-hover rounded-2xl p-6">
          <h3 className="font-semibold text-base mb-1 flex items-center gap-2" style={{ color: "#f0b429" }}>
            <span>🤖</span> AI Tactical Analysis
          </h3>
          <p className="text-slate-500 text-xs mb-5">Powered by Claude · Real match data</p>

          <div className="space-y-3 min-h-28">
            {analyzing ? (
              <div className="flex items-center gap-3 text-slate-400 py-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#f0b429" }} />
                  <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "#f0b429" }} />
                </span>
                <span className="animate-pulse text-sm">Claude is analysing match events…</span>
              </div>
            ) : error ? (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", color: "#e63946" }}>
                {error}
              </div>
            ) : insights.length > 0 ? (
              insights.map((text, i) => <InsightCard key={i} text={text} i={i} />)
            ) : (
              <p className="text-slate-500 text-sm py-4">
                Click below to generate AI tactical analysis for this match.
              </p>
            )}
          </div>

          <button
            onClick={runAnalysis}
            disabled={analyzing || loading}
            className="shimmer-parent relative overflow-hidden mt-6 w-full py-4 rounded-xl font-black text-sm tracking-wide transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: "linear-gradient(135deg, #c97c1a 0%, #f0b429 50%, #ffd970 100%)", color: "#07090f" }}
          >
            {analyzing ? "Analysing…" : "⚡ Generate AI Tactical Analysis"}
          </button>
        </div>

        {/* ── WC2026 Feature callout ────────────────────────────── */}
        <div className="rounded-2xl p-6 relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, rgba(240,180,41,0.08) 0%, rgba(240,180,41,0.03) 100%)", border: "1px solid rgba(240,180,41,0.2)" }}>
          <div className="floodlight left-[50%]" style={{ height: "100%", animationDuration: "8s" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏆</span>
              <div>
                <p className="font-black text-lg wc-gold-text">Ready for World Cup 2026?</p>
                <p className="text-slate-400 text-sm">USA · Canada · Mexico · June 11 – July 19, 2026</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: "📊", label: "Live xG Tracking",     desc: "Real-time expected goals" },
                { icon: "🎯", label: "Formation Intel",       desc: "Tactical shape analysis" },
                { icon: "🔭", label: "Player Scouting",      desc: "48-nation talent radar" },
                { icon: "🤖", label: "Claude AI Insights",   desc: "Per-match tactical reports" },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(240,180,41,0.06)" }}>
                  <span className="text-2xl block mb-1">{icon}</span>
                  <p className="font-semibold text-xs text-white">{label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/matches"
                className="shimmer-parent relative overflow-hidden font-bold text-sm px-5 py-2.5 rounded-xl transition-all"
                style={{ background: "linear-gradient(135deg, #f0b429, #ffd970)", color: "#07090f" }}>
                Explore Matches
              </Link>
              <Link href="/register"
                className="font-semibold text-sm px-5 py-2.5 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(240,180,41,0.3)", color: "#f0b429" }}>
                Start free →
              </Link>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
