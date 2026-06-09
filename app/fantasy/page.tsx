"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FantasyPlayer {
  id: number;
  name: string;
  position: string;
  team: string;
  fplScore: number;
  fplRating: number;
  formRating: string;
  goals: number;
  assists: number;
  avgRating: number;
}

interface FantasyData {
  week: string;
  picks: FantasyPlayer[];
  allPlayers: FantasyPlayer[];
  aiReason: string;
}

const POS_COLOR: Record<string, string> = {
  GK: "bg-yellow-500/20 text-yellow-400",
  DEF: "bg-blue-500/20 text-blue-400",
  MID: "bg-emerald-500/20 text-emerald-400",
  FWD: "bg-red-500/20 text-red-400",
};

function posColor(pos: string) {
  const up = pos.toUpperCase();
  if (up.includes("GK")) return POS_COLOR.GK;
  if (up.includes("B") && !up.includes("AM")) return POS_COLOR.DEF;
  if (up.includes("M")) return POS_COLOR.MID;
  return POS_COLOR.FWD;
}

function PlayerRow({ p, rank }: { p: FantasyPlayer; rank: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
      <span className="text-slate-600 text-xs font-mono w-5 text-right shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{p.name}</p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${posColor(p.position)}`}>{p.position}</span>
          <span className="text-[10px] text-slate-500">{p.formRating}</span>
        </div>
        <p className="text-xs text-slate-500">{p.team}</p>
      </div>
      <div className="flex gap-3 shrink-0 text-xs text-center">
        <div><p className="font-bold text-emerald-400">{p.fplScore}</p><p className="text-slate-600">pts</p></div>
        <div className="hidden sm:block"><p className="font-bold text-white">{p.goals}</p><p className="text-slate-600">G</p></div>
        <div className="hidden sm:block"><p className="font-bold text-white">{p.assists}</p><p className="text-slate-600">A</p></div>
        <div className="hidden md:block"><p className="font-bold text-white">{p.avgRating.toFixed(1)}</p><p className="text-slate-600">Rtg</p></div>
      </div>
    </div>
  );
}

export default function FantasyPage() {
  const [data, setData] = useState<FantasyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"picks" | "all">("picks");

  useEffect(() => {
    fetch("/api/fantasy/picks")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-white text-sm transition-colors">← Dashboard</Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-2xl font-black">Fantasy Picks</h1>
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-semibold">FPL</span>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 animate-pulse">
            <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded" />)}</div>
          </div>
        ) : !data ? (
          <p className="text-slate-500 text-sm">Could not load fantasy picks.</p>
        ) : (
          <>
            {/* AI summary */}
            {data.aiReason && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-slate-300">
                <span className="text-emerald-400 font-medium">🤖 This week: </span>{data.aiReason}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
              {(["picks", "all"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize cursor-pointer ${tab === t ? "bg-emerald-500 text-black" : "text-slate-400 hover:text-white"}`}>
                  {t === "picks" ? "Best XI" : "All Players"}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {tab === "picks" ? "Recommended XI" : `Top ${data.allPlayers.length} Players`}
                </p>
                <p className="text-xs text-slate-500">
                  FPL pts = goals×6 + assists×3 + form bonus
                </p>
              </div>
              <div className="divide-y divide-white/5">
                {(tab === "picks" ? data.picks : data.allPlayers).map((p, i) => (
                  <PlayerRow key={p.id} p={p} rank={i + 1} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-slate-500">
              <p>FPL score estimate based on in-app match data. Updated after each match processed. Points: Goals×6, Assists×3, Form bonus (rating 8+ = +2/game, 9+ = +3/game), Appearances×1.</p>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
