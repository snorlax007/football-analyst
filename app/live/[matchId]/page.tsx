"use client";

import { useEffect, useRef, useState, use, useCallback } from "react";
import Link from "next/link";

interface MatchState {
  id: number;
  homeScore: number;
  awayScore: number;
  status: string;
  currentMinute: number | null;
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
  homeTeamId: number;
  awayTeamId: number;
}

interface LiveStats {
  team_id: number;
  possession: number;
  shots: number;
  shots_on_target: number;
  xg: number;
  corners: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
}

interface LiveEvent {
  id: string;
  type: string;
  minute: number | null;
  player_name: string | null;
  description: string | null;
  ai_comment: string | null;
  team_name: string | null;
  team_id: number | null;
  created_at: string;
}

interface Toast {
  id: string;
  event: LiveEvent;
}

const EVENT_ICON: Record<string, string> = {
  goal:             "⚽",
  own_goal:         "⚽",
  yellow_card:      "🟨",
  red_card:         "🟥",
  substitution:     "🔄",
  var:              "📺",
  kickoff:          "▶️",
  halftime:         "⏸",
  fulltime:         "🏁",
  penalty:          "🎯",
  corner:           "🚩",
  dangerous_attack: "⚡",
  foul:             "⚠️",
  offside:          "🚫",
  injury:           "🏥",
};

const EVENT_COLOR: Record<string, string> = {
  goal:             "bg-emerald-500/15 border-emerald-500",
  own_goal:         "bg-orange-500/15 border-orange-400",
  red_card:         "bg-red-500/15 border-red-500",
  yellow_card:      "bg-yellow-500/10 border-yellow-400/60",
  var:              "bg-blue-500/10 border-blue-400/60",
  penalty:          "bg-purple-500/10 border-purple-400/60",
  halftime:         "bg-slate-700/50 border-slate-500/40",
  fulltime:         "bg-slate-700/50 border-slate-500/40",
  kickoff:          "bg-slate-700/50 border-slate-500/40",
};

function StatDualBar({
  label,
  homeVal,
  awayVal,
  fmt,
}: {
  label: string;
  homeVal: number;
  awayVal: number;
  fmt?: (v: number) => string;
}) {
  const total = homeVal + awayVal || 1;
  const homePct = Math.round((homeVal / total) * 100);
  const awayPct = 100 - homePct;
  const f = fmt ?? ((v: number) => String(v));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold tabular-nums text-emerald-400">{f(homeVal)}</span>
        <span className="text-slate-500 text-[10px] uppercase tracking-widest">{label}</span>
        <span className="font-semibold tabular-nums text-slate-300">{f(awayVal)}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
        <div
          className="bg-emerald-500 rounded-l-full transition-all duration-700"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="bg-slate-500 rounded-r-full flex-1 transition-all duration-700"
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  );
}

function GoalToast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const isGoal = toast.event.type === "goal" || toast.event.type === "own_goal";
  const isCard = toast.event.type === "red_card" || toast.event.type === "yellow_card";

  return (
    <div
      className={`animate-slide-in flex items-start gap-3 rounded-xl px-4 py-3 shadow-2xl border backdrop-blur-sm cursor-pointer ${
        isGoal
          ? "bg-emerald-950/90 border-emerald-500/60"
          : isCard && toast.event.type === "red_card"
            ? "bg-red-950/90 border-red-500/60"
            : "bg-slate-900/90 border-white/20"
      }`}
      onClick={() => onDismiss(toast.id)}
    >
      <span className="text-2xl leading-none mt-0.5">{EVENT_ICON[toast.event.type] ?? "•"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">
          {isGoal ? "GOAL!" : toast.event.type.replace(/_/g, " ").toUpperCase()}
          {toast.event.minute != null && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">{toast.event.minute}&apos;</span>
          )}
        </p>
        {toast.event.player_name && (
          <p className="text-xs text-slate-300 mt-0.5">{toast.event.player_name}</p>
        )}
        {toast.event.ai_comment && (
          <p className="text-xs text-emerald-400/80 mt-0.5 italic line-clamp-1">"{toast.event.ai_comment}"</p>
        )}
      </div>
    </div>
  );
}

export default function LiveMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [homeStats, setHomeStats] = useState<LiveStats | null>(null);
  const [awayStats, setAwayStats] = useState<LiveStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [prevScore, setPrevScore] = useState<{ home: number; away: number } | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/live/${matchId}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as {
          type: string;
          match?: MatchState;
          event?: LiveEvent;
          homeStats?: LiveStats | null;
          awayStats?: LiveStats | null;
          message?: string;
          eventCount?: number;
        };

        if (msg.type === "state" && msg.match) {
          setMatch((prev) => {
            // Detect score change → toast
            if (prev && (prev.homeScore !== msg.match!.homeScore || prev.awayScore !== msg.match!.awayScore)) {
              setPrevScore({ home: prev.homeScore, away: prev.awayScore });
            }
            return msg.match!;
          });
        } else if (msg.type === "event" && msg.event) {
          setEvents((prev) => {
            if (prev.some((x) => x.id === msg.event!.id)) return prev;
            // Show toast for impactful events
            const toastTypes = new Set(["goal", "own_goal", "red_card", "yellow_card", "penalty", "var"]);
            if (toastTypes.has(msg.event!.type)) {
              setToasts((t) => [...t, { id: `${msg.event!.id}-${Date.now()}`, event: msg.event! }]);
            }
            return [...prev, msg.event!];
          });
        } else if (msg.type === "stats") {
          if (msg.homeStats) setHomeStats(msg.homeStats);
          if (msg.awayStats) setAwayStats(msg.awayStats);
        } else if (msg.type === "finished") {
          setFinished(true);
          es.close();
        } else if (msg.type === "error") {
          setError(msg.message ?? "Unknown error");
          es.close();
        }
      } catch {}
    };

    return () => es.close();
  }, [matchId]);

  // Auto-scroll to latest event
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const statusLabel =
    finished || match?.status === "finished"
      ? "Full Time"
      : match?.status === "live"
        ? match.currentMinute != null ? `${match.currentMinute}'` : "Live"
        : match?.status === "halftime"
          ? "Half Time"
          : match?.status === "scheduled"
            ? "Upcoming"
            : match?.status ?? "…";

  const isLive = match?.status === "live" && !finished;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <GoalToast toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="text-slate-500 hover:text-white text-sm transition-colors">
            ← Matches
          </Link>
          {match && <span className="text-slate-700 text-xs">/ Live</span>}
        </div>

        {/* Score board */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8">
          {!match ? (
            <div className="text-center text-slate-500 py-4">Connecting…</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Home</p>
                  <h2 className="text-xl sm:text-3xl font-bold leading-tight">{match.homeName}</h2>
                </div>

                <div className="text-center flex-shrink-0 px-2">
                  <p className="text-5xl sm:text-6xl font-black text-emerald-400 tabular-nums leading-none">
                    {match.homeScore} – {match.awayScore}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span
                      className={`inline-block text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-semibold ${
                        isLive
                          ? "bg-red-500/20 text-red-400"
                          : finished || match.status === "finished"
                            ? "bg-slate-700/80 text-slate-400"
                            : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    {isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Away</p>
                  <h2 className="text-xl sm:text-3xl font-bold leading-tight">{match.awayName}</h2>
                </div>
              </div>

              <p className={`text-center text-xs mt-4 ${connected ? "text-emerald-500/60" : "text-slate-600"}`}>
                {connected ? "● Live updates connected" : "○ Reconnecting…"}
              </p>
            </>
          )}
        </div>

        {/* Live stats panel */}
        {(homeStats || awayStats) && match && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
                {match.homeShort}
              </span>
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-widest">
                Live Stats
              </span>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
                {match.awayShort}
              </span>
            </div>
            <div className="space-y-3">
              <StatDualBar
                label="Possession"
                homeVal={homeStats?.possession ?? 50}
                awayVal={awayStats?.possession ?? 50}
                fmt={(v) => `${v}%`}
              />
              <StatDualBar
                label="Shots"
                homeVal={homeStats?.shots ?? 0}
                awayVal={awayStats?.shots ?? 0}
              />
              <StatDualBar
                label="On Target"
                homeVal={homeStats?.shots_on_target ?? 0}
                awayVal={awayStats?.shots_on_target ?? 0}
              />
              <StatDualBar
                label="xG"
                homeVal={homeStats?.xg ?? 0}
                awayVal={awayStats?.xg ?? 0}
                fmt={(v) => v.toFixed(2)}
              />
              <StatDualBar
                label="Corners"
                homeVal={homeStats?.corners ?? 0}
                awayVal={awayStats?.corners ?? 0}
              />
              <StatDualBar
                label="Fouls"
                homeVal={homeStats?.fouls ?? 0}
                awayVal={awayStats?.fouls ?? 0}
              />
            </div>
          </div>
        )}

        {/* Live Timeline */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h3 className="text-emerald-400 font-semibold text-sm mb-4 flex items-center gap-2">
            Match Timeline
            {events.length > 0 && (
              <span className="text-xs text-slate-500 font-normal">{events.length} events</span>
            )}
            {isLive && (
              <span className="ml-auto text-[10px] text-red-400 font-normal animate-pulse">● Live</span>
            )}
          </h3>

          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {match?.status === "scheduled"
                ? "Kick-off pending. Updates will appear here automatically."
                : "No events yet."}
            </div>
          ) : (
            <div className="space-y-2">
              {[...events].reverse().map((ev) => (
                <div
                  key={ev.id}
                  className={`flex gap-3 rounded-xl px-4 py-3 border-l-2 ${
                    EVENT_COLOR[ev.type] ?? "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex-shrink-0 text-center w-9">
                    <span className="text-base leading-none">{EVENT_ICON[ev.type] ?? "•"}</span>
                    {ev.minute != null && (
                      <p className="text-[10px] text-slate-500 mt-0.5">{ev.minute}&apos;</p>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {ev.type.replace(/_/g, " ")}
                      </span>
                      {ev.team_name && (
                        <span className="text-xs text-slate-600">· {ev.team_name}</span>
                      )}
                    </div>
                    {ev.player_name && (
                      <p className="text-sm font-semibold mt-0.5">{ev.player_name}</p>
                    )}
                    {ev.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>
                    )}
                    {ev.ai_comment && (
                      <p className="text-xs text-emerald-400/80 mt-1 italic">"{ev.ai_comment}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={eventsEndRef} />
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href={`/matches/${matchId}`}
            className="flex-1 text-center py-3 rounded-xl border border-white/20 text-slate-300 hover:border-white/40 text-sm font-medium transition"
          >
            Full match stats →
          </Link>
          <Link
            href={`/share/${matchId}`}
            className="flex-1 text-center py-3 rounded-xl border border-white/20 text-slate-300 hover:border-white/40 text-sm font-medium transition"
          >
            Share
          </Link>
        </div>
      </main>

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
