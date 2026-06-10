"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MatchRow {
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
}

interface LiveUpdate {
  id: number;
  homeScore: number;
  awayScore: number;
  status: string;
  currentMinute: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  finished: "FT",
  live:      "Live",
  scheduled: "vs",
  halftime:  "HT",
};

const STATUS_COLOR: Record<string, string> = {
  finished: "bg-slate-700 text-slate-400",
  live:     "bg-red-500/20 text-red-400",
  halftime: "bg-yellow-500/20 text-yellow-400",
  scheduled:"bg-blue-500/20 text-blue-400",
};

export default function MatchList({ initial }: { initial: MatchRow[] }) {
  const [matches, setMatches] = useState(initial);
  const [liveIds, setLiveIds] = useState<Set<number>>(
    new Set(initial.filter((m) => m.status === "live").map((m) => m.id))
  );

  // Poll live scores every 15s only when there are live matches
  useEffect(() => {
    if (liveIds.size === 0) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/matches/live", { cache: "no-store" });
        if (!res.ok) return;
        const live: LiveUpdate[] = await res.json() as LiveUpdate[];

        const liveMap = new Map(live.map((l) => [l.id, l]));

        setMatches((prev) =>
          prev.map((m) => {
            const u = liveMap.get(m.id);
            if (!u) return m;
            return {
              ...m,
              homeScore: u.homeScore,
              awayScore: u.awayScore,
              status: u.status,
              currentMinute: u.currentMinute,
            };
          })
        );

        // Update which IDs are still live
        setLiveIds(new Set(live.map((l) => l.id)));
      } catch {}
    };

    const interval = setInterval(() => { void poll(); }, 15000);
    return () => clearInterval(interval);
  }, [liveIds.size]);

  return (
    <div className="space-y-3">
      {matches.length === 0 && (
        <p className="text-slate-500 text-center py-12">No matches available yet.</p>
      )}
      {matches.map((m) => {
        const isLive = m.status === "live";
        const minuteLabel = isLive && m.currentMinute != null ? `${m.currentMinute}'` : null;
        const statusText = minuteLabel ?? (STATUS_LABEL[m.status] ?? m.status);

        return (
          <Link
            key={m.id}
            href={isLive ? `/live/${m.id}` : `/matches/${m.id}`}
            className="group flex items-center justify-between rounded-2xl px-6 py-5 transition-all wc-card wc-card-hover shimmer-parent relative overflow-hidden"
            style={isLive ? {
              background: "rgba(230,57,70,0.06)",
              borderColor: "rgba(230,57,70,0.35)",
            } : undefined}
          >
            <div className="flex-1 text-right min-w-0">
              <p className="font-bold text-base truncate transition-colors group-hover:text-[#f0b429]">
                {m.homeName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{m.homeShort}</p>
            </div>

            <div className="mx-3 sm:mx-6 text-center flex-shrink-0">
              {m.status === "scheduled" ? (
                <p className="text-xl font-black text-slate-400">–</p>
              ) : (
                <p
                  className="text-xl font-black tabular-nums"
                  style={{ color: isLive ? "#e63946" : "#f0b429" }}
                >
                  {m.homeScore} – {m.awayScore}
                </p>
              )}
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span
                  className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-widest"
                  style={isLive
                    ? { background: "rgba(230,57,70,0.15)", color: "#e63946" }
                    : { background: "rgba(240,180,41,0.1)", color: "#f0b429" }
                  }
                >
                  {statusText}
                </span>
                {isLive && <span className="live-dot" />}
              </div>
            </div>

            <div className="flex-1 text-left min-w-0">
              <p className="font-bold text-base truncate">{m.awayName}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.awayShort}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
