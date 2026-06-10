"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

export interface MatchRow {
  id: number;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  currentMinute: number | null;
  homeName: string;
  homeShort: string;
  awayName: string;
  awayShort: string;
  matchDate: string;
  league: string | null;
  competition: string | null;
}

interface LiveUpdate {
  id: number;
  homeScore: number;
  awayScore: number;
  status: string;
  currentMinute: number | null;
}

const COMP_BADGE: Record<string, { label: string; color: string }> = {
  WC:  { label: "🏆 World Cup 2026", color: "rgba(240,180,41,0.9)" },
  UNL: { label: "⚔️ Nations League",  color: "#60a5fa" },
  EC:  { label: "🌍 Euro Quals",      color: "#34d399" },
  CLI: { label: "🌎 Copa Lib.",       color: "#a78bfa" },
  PL:  { label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League", color: "#f472b6" },
};

function compBadge(code: string | null, league: string | null) {
  if (code && COMP_BADGE[code]) return COMP_BADGE[code];
  if (league) return { label: league, color: "rgba(240,180,41,0.5)" };
  return null;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function matchTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function MatchList({
  initial,
  filter,
}: {
  initial: MatchRow[];
  filter?: string;
}) {
  const [matches, setMatches] = useState(initial);
  const [liveIds, setLiveIds] = useState<Set<number>>(
    new Set(initial.filter((m) => m.status === "live").map((m) => m.id))
  );

  useEffect(() => { setMatches(initial); }, [initial]);

  // Poll live scores every 15s only when there are live matches
  useEffect(() => {
    if (liveIds.size === 0) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/matches/live", { cache: "no-store" });
        if (!res.ok) return;
        const live = await res.json() as LiveUpdate[];
        const liveMap = new Map(live.map((l) => [l.id, l]));
        setMatches((prev) =>
          prev.map((m) => {
            const u = liveMap.get(m.id);
            return u ? { ...m, homeScore: u.homeScore, awayScore: u.awayScore, status: u.status, currentMinute: u.currentMinute } : m;
          })
        );
        setLiveIds(new Set(live.map((l) => l.id)));
      } catch {}
    };
    const interval = setInterval(() => { void poll(); }, 15000);
    return () => clearInterval(interval);
  }, [liveIds.size]);

  // Filter by competition
  const filtered = useMemo(() => {
    if (!filter || filter === "all") return matches;
    return matches.filter((m) => (m.competition ?? "") === filter || (m.league ?? "") === filter);
  }, [matches, filter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of filtered) {
      const key = new Date(m.matchDate).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 text-sm">
        No matches found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(([dateKey, dayMatches]) => (
        <div key={dateKey}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#f0b429" }}>
              {dateLabel(dayMatches[0].matchDate)}
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(240,180,41,0.12)" }} />
          </div>

          <div className="space-y-2.5">
            {dayMatches.map((m) => {
              const isLive      = m.status === "live";
              const isScheduled = m.status === "scheduled";
              const minuteLabel = isLive && m.currentMinute != null ? `${m.currentMinute}'` : null;
              const statusText  = minuteLabel ?? (isLive ? "Live" : isScheduled ? matchTime(m.matchDate) : "FT");
              const badge       = compBadge(m.competition, m.league);

              return (
                <Link
                  key={m.id}
                  href={isLive ? `/live/${m.id}` : `/matches/${m.id}`}
                  className="group flex items-center rounded-2xl px-5 py-4 transition-all wc-card wc-card-hover shimmer-parent relative overflow-hidden"
                  style={isLive ? { background: "rgba(230,57,70,0.06)", borderColor: "rgba(230,57,70,0.35)" } : undefined}
                >
                  {/* Competition badge — left edge */}
                  {badge && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl"
                      style={{ background: badge.color }}
                    />
                  )}

                  {/* Home team */}
                  <div className="flex-1 text-right min-w-0 pr-4">
                    <p className="font-bold text-sm sm:text-base truncate transition-colors group-hover:text-[#f0b429]">
                      {m.homeName}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wide">{m.homeShort}</p>
                  </div>

                  {/* Score / time */}
                  <div className="text-center flex-shrink-0 w-28">
                    {badge && (
                      <p
                        className="text-[9px] font-semibold uppercase tracking-wide mb-1 truncate"
                        style={{ color: badge.color }}
                      >
                        {badge.label}
                      </p>
                    )}
                    {isScheduled ? (
                      <p className="text-lg font-black text-slate-400">–</p>
                    ) : (
                      <p
                        className="text-lg font-black tabular-nums"
                        style={{ color: isLive ? "#e63946" : "#f0b429" }}
                      >
                        {m.homeScore} – {m.awayScore}
                      </p>
                    )}
                    <div className="mt-0.5 flex items-center justify-center gap-1.5">
                      <span
                        className="inline-block text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest"
                        style={isLive
                          ? { background: "rgba(230,57,70,0.18)", color: "#e63946" }
                          : isScheduled
                            ? { background: "rgba(255,255,255,0.06)", color: "#94a3b8" }
                            : { background: "rgba(240,180,41,0.1)", color: "#f0b429" }
                        }
                      >
                        {statusText}
                      </span>
                      {isLive && <span className="live-dot" style={{ width: 6, height: 6 }} />}
                    </div>
                  </div>

                  {/* Away team */}
                  <div className="flex-1 text-left min-w-0 pl-4">
                    <p className="font-bold text-sm sm:text-base truncate">{m.awayName}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wide">{m.awayShort}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
