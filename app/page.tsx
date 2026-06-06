"use client";

import { useState } from "react";
import Image from "next/image";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1762013315117-1c8005ad2b41?auto=format&fit=crop&w=1920&q=80";

const ALL_INSIGHTS = [
  "City exploited Arsenal's left flank repeatedly, generating 43% of attacks from that channel.",
  "Arsenal's defensive line became increasingly stretched after the 60th minute.",
  "Haaland occupied both center backs effectively, creating space for midfield runners.",
  "Rodri controlled transition phases and completed 96% of progressive passes.",
  "City's counter-press recovered possession within 8 seconds on average.",
  "Arsenal's build-up efficiency dropped significantly under aggressive pressing.",
  "Expected threat metrics show City's right wing generated the most dangerous attacks.",
  "Substitution patterns improved City's defensive stability in the final 20 minutes.",
  "Arsenal conceded multiple overload situations near the half-spaces.",
  "City maintained tactical compactness and prevented central penetration.",
];

const DEFAULT_INSIGHTS = [
  "Manchester City dominated midfield progression through central overloads and quick one-touch combinations.",
  "Arsenal struggled against City's high press, losing possession 18 times in their defensive third.",
  "City's xG of 2.7 indicates the scoreline accurately reflects the quality of chances created.",
];

const STATS = [
  { label: "Possession", value: "65%", pct: 65 },
  { label: "Pass Accuracy", value: "91%", pct: 91 },
  { label: "Expected Goals (xG)", value: "2.7", pct: 87 },
  { label: "Pressing Efficiency", value: "82%", pct: 82 },
];

const PLAYERS = [
  { name: "Kevin De Bruyne", pos: "MF", rating: 9.4 },
  { name: "Erling Haaland", pos: "FW", rating: 9.1 },
  { name: "Rodri", pos: "DM", rating: 8.8 },
  { name: "Bernardo Silva", pos: "MF", rating: 8.5 },
];

function pickRandom(pool: string[], count: number): string[] {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

export default function Home() {
  const [insights, setInsights] = useState<string[]>(DEFAULT_INSIGHTS);
  const [loading, setLoading] = useState(false);

  function runAnalysis() {
    setLoading(true);
    setTimeout(() => {
      setInsights(pickRandom(ALL_INSIGHTS, 4));
      setLoading(false);
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* Hero */}
      <header className="relative h-72 md:h-84 overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt="Allianz Arena packed for a Champions League night match"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/60 to-slate-950" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-4 py-1.5 mb-5 text-emerald-400 text-xs font-semibold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Analysis
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-lg">
            ⚽ Football AI Match Analyst
          </h1>
          <p className="mt-3 text-slate-400 text-base md:text-lg max-w-lg">
            Automated Tactical Intelligence &amp; Performance Analysis
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Match Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">Home</p>
              <h2 className="text-xl md:text-3xl font-bold leading-tight">Manchester City</h2>
            </div>
            <div className="text-center flex-shrink-0">
              <p className="text-5xl md:text-6xl font-black text-emerald-400 tabular-nums leading-none">
                3 – 1
              </p>
              <span className="mt-3 inline-block text-[10px] bg-slate-700/80 text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest font-semibold">
                Full Time
              </span>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">Away</p>
              <h2 className="text-xl md:text-3xl font-bold leading-tight">Arsenal</h2>
            </div>
          </div>
        </div>

        {/* Stats + Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Team Statistics */}
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
            <h3 className="text-emerald-400 font-semibold text-base mb-6 flex items-center gap-2">
              📊 Team Statistics
            </h3>
            <div className="space-y-5">
              {STATS.map(({ label, value, pct }) => (
                <div key={label}>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-slate-300">{label}</span>
                    <span className="text-emerald-400 font-bold tabular-nums">{value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Player Ratings */}
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
            <h3 className="text-emerald-400 font-semibold text-base mb-6 flex items-center gap-2">
              ⭐ Top Player Ratings
            </h3>
            <div className="space-y-3">
              {PLAYERS.map(({ name, pos, rating }, i) => (
                <div
                  key={name}
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-colors rounded-xl px-4 py-3 group"
                >
                  <span className="text-slate-600 text-xs font-mono w-4 text-center group-hover:text-slate-400 transition-colors">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{name}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{pos}</p>
                  </div>
                  <span className="text-xl font-black text-emerald-400 tabular-nums">
                    {rating.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
          <h3 className="text-emerald-400 font-semibold text-base mb-5 flex items-center gap-2">
            🤖 AI Tactical Analysis
          </h3>

          <div className="space-y-3 min-h-28">
            {loading ? (
              <div className="flex items-center gap-3 text-slate-400 py-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="animate-pulse text-sm">AI Agent analyzing 4,382 match events...</span>
              </div>
            ) : (
              insights.map((text, i) => (
                <div
                  key={i}
                  className="flex gap-3 bg-white/5 rounded-xl px-4 py-3 border-l-2 border-emerald-500/60"
                >
                  <span className="text-emerald-500 text-lg leading-none mt-0.5 flex-shrink-0">›</span>
                  <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                </div>
              ))
            )}
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold text-sm tracking-wide transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Analyzing…" : "Generate New AI Analysis"}
          </button>
        </div>

      </main>
    </div>
  );
}
