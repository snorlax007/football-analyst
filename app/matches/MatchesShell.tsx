"use client";

import { useState } from "react";
import MatchList, { type MatchRow } from "./MatchList";

const COMP_LABEL: Record<string, string> = {
  WC:  "🏆 World Cup",
  UNL: "⚔️ Nations League",
  EC:  "🌍 Euro Quals",
  CLI: "🌎 Copa Lib.",
  PL:  "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League",
};

export default function MatchesShell({
  matches,
  competitions,
  liveCount,
}: {
  matches: MatchRow[];
  competitions: string[];
  liveCount: number;
}) {
  const [activeFilter, setActiveFilter] = useState("all");

  const hasWC = competitions.includes("WC");

  return (
    <div className="min-h-screen text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black wc-gold-text">
              {hasWC ? "World Cup 2026 Matches" : "Matches"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {liveCount > 0
                ? `${liveCount} live · scores update automatically`
                : `${matches.length} match${matches.length !== 1 ? "es" : ""} · click to view stats & AI analysis`}
            </p>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold mt-1" style={{ color: "#e63946" }}>
              <span className="live-dot" />
              Live
            </div>
          )}
        </div>

        {/* Competition filter tabs */}
        {competitions.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveFilter("all")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
              style={activeFilter === "all"
                ? { background: "rgba(240,180,41,0.15)", borderColor: "rgba(240,180,41,0.5)", color: "#f0b429" }
                : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#64748b" }
              }
            >
              All
            </button>
            {competitions.map((c) => (
              <button
                key={c}
                onClick={() => setActiveFilter(c)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                style={activeFilter === c
                  ? { background: "rgba(240,180,41,0.15)", borderColor: "rgba(240,180,41,0.5)", color: "#f0b429" }
                  : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#64748b" }
                }
              >
                {COMP_LABEL[c] ?? c}
              </button>
            ))}
          </div>
        )}

        <MatchList initial={matches} filter={activeFilter} />

        {matches.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏆</p>
            <p className="text-slate-300 font-semibold mb-2">No matches yet</p>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Run the match sync to pull real World Cup 2026 fixtures, or use the admin tools to seed data.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
