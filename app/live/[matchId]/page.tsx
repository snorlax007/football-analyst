"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";

interface MatchState {
  id: number;
  homeScore: number;
  awayScore: number;
  status: string;
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
}

interface LiveEvent {
  id: string;
  type: string;
  minute: number | null;
  player_name: string | null;
  description: string | null;
  ai_comment: string | null;
  team_name: string | null;
  created_at: string;
}

const EVENT_ICON: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
  var: "📺",
  kickoff: "▶️",
  halftime: "⏸",
  fulltime: "🏁",
  penalty: "🎯",
};

export default function LiveMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/live/${matchId}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      // Retry handled automatically by browser EventSource
    };

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "state") {
          setMatch(msg.match);
        } else if (msg.type === "event") {
          setEvents((prev) => {
            if (prev.some((x) => x.id === msg.event.id)) return prev;
            return [...prev, msg.event];
          });
        } else if (msg.type === "finished") {
          setFinished(true);
          es.close();
        } else if (msg.type === "error") {
          setError(msg.message);
          es.close();
        }
      } catch {}
    };

    return () => es.close();
  }, [matchId]);

  // Auto-scroll timeline
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const statusLabel =
    finished || match?.status === "finished"
      ? "Full Time"
      : match?.status === "live"
        ? "Live"
        : match?.status === "scheduled"
          ? "Upcoming"
          : match?.status ?? "…";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="text-slate-500 hover:text-white text-sm transition-colors">
            ← Matches
          </Link>
          {match && <span className="text-slate-700 text-xs">/ Live</span>}
        </div>

        {/* Score board */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
          {!match ? (
            <div className="text-center text-slate-500 py-4">Connecting…</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Home</p>
                  <h2 className="text-2xl md:text-3xl font-bold">{match.homeName}</h2>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-5xl md:text-6xl font-black text-emerald-400 tabular-nums leading-none">
                    {match.homeScore} – {match.awayScore}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className={`inline-block text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-semibold ${
                      match.status === "live" && !finished
                        ? "bg-red-500/20 text-red-400"
                        : "bg-slate-700/80 text-slate-400"
                    }`}>
                      {statusLabel}
                    </span>
                    {match.status === "live" && !finished && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Away</p>
                  <h2 className="text-2xl md:text-3xl font-bold">{match.awayName}</h2>
                </div>
              </div>
              <p className={`text-center text-xs mt-4 ${connected ? "text-emerald-500/60" : "text-slate-600"}`}>
                {connected ? "● Live updates connected" : "○ Reconnecting…"}
              </p>
            </>
          )}
        </div>

        {/* Live Timeline */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-emerald-400 font-semibold text-base mb-4">
            📋 Match Timeline
            {events.length > 0 && (
              <span className="ml-2 text-xs text-slate-500 font-normal">{events.length} events</span>
            )}
          </h3>

          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {match?.status === "scheduled"
                ? "Match has not kicked off yet. Updates will appear here automatically."
                : "No events recorded yet."}
            </div>
          ) : (
            <div className="space-y-3">
              {[...events].reverse().map((ev) => (
                <div
                  key={ev.id}
                  className={`flex gap-4 rounded-xl px-4 py-3 border-l-2 ${
                    ev.type === "goal"
                      ? "bg-emerald-500/10 border-emerald-500"
                      : ev.type === "red_card"
                        ? "bg-red-500/10 border-red-500"
                        : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex-shrink-0 text-center w-10">
                    <span className="text-lg leading-none">{EVENT_ICON[ev.type] ?? "•"}</span>
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
            🔗 Share
          </Link>
        </div>
      </main>
    </div>
  );
}
