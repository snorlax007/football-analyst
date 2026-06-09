"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface Player {
  id: number;
  name: string;
  position: string;
  age: number | null;
  team_name: string;
  matches_played: number;
  avg_rating: number;
  total_goals: number;
  total_assists: number;
  avg_pass_accuracy: number;
  total_shots: number;
  avg_tackles: number;
}

interface ShortlistEntry extends Player {
  player_id: number;
  notes: string;
  created_at: string;
}

type Tab = "search" | "shortlist";

const POSITIONS = ["", "GK", "CB", "LB", "RB", "DM", "CM", "LM", "RM", "AM", "LW", "RW", "CF", "ST"];

export default function ScoutingPage() {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("");
  const [minRating, setMinRating] = useState("");
  const [minGoals, setMinGoals] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [searching, setSearching] = useState(false);
  const [shortlist, setShortlist] = useState<ShortlistEntry[]>([]);
  const [shortlistLoaded, setShortlistLoaded] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const search = useCallback(async () => {
    setSearching(true);
    setAiSummary("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (position) params.set("position", position);
      if (minRating) params.set("minRating", minRating);
      if (minGoals) params.set("minGoals", minGoals);
      const res = await fetch(`/api/scouting/players?${params}`);
      if (res.status === 401) { setPlayers([]); setAiSummary("Sign in to use scouting."); return; }
      const data = await res.json() as { players: Player[]; aiSummary: string };
      setPlayers(data.players);
      setAiSummary(data.aiSummary);
    } finally {
      setSearching(false);
    }
  }, [query, position, minRating, minGoals]);

  async function loadShortlist() {
    if (shortlistLoaded) return;
    const res = await fetch("/api/scouting/shortlist");
    if (res.ok) {
      const data = await res.json() as { shortlist: ShortlistEntry[] };
      setShortlist(data.shortlist);
    }
    setShortlistLoaded(true);
  }

  async function addToShortlist(player: Player) {
    setSaving(player.id);
    await fetch("/api/scouting/shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: player.id }),
    });
    setSaving(null);
  }

  async function removeFromShortlist(entryId: number) {
    await fetch(`/api/scouting/shortlist/${entryId}`, { method: "DELETE" });
    setShortlist((prev) => prev.filter((e) => e.id !== entryId));
  }

  async function downloadReport(playerId: number) {
    setDownloading(playerId);
    try {
      const res = await fetch(`/api/report/scout/${playerId}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scout-report-${playerId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    if (t === "shortlist") loadShortlist();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-white text-sm transition-colors">← Dashboard</Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-2xl font-black">Player Scouting</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
          {(["search", "shortlist"] as Tab[]).map((t) => (
            <button key={t} onClick={() => switchTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize cursor-pointer ${tab === t ? "bg-emerald-500 text-black" : "text-slate-400 hover:text-white"}`}>
              {t === "shortlist" ? `My Shortlist${shortlist.length > 0 ? ` (${shortlist.length})` : ""}` : "Search Players"}
            </button>
          ))}
        </div>

        {tab === "search" && (
          <>
            {/* Search controls */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Natural language query</label>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    placeholder='e.g. "fast left wingers with high tackle rate" or leave blank for filters below'
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button onClick={search} disabled={searching}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-5 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer">
                    {searching ? "…" : "Search"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Position</label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    {POSITIONS.map((p) => <option key={p} value={p}>{p || "All positions"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Min Rating</label>
                  <input type="number" value={minRating} onChange={(e) => setMinRating(e.target.value)}
                    placeholder="6.0" min={0} max={10} step={0.1}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Min Goals</label>
                  <input type="number" value={minGoals} onChange={(e) => setMinGoals(e.target.value)}
                    placeholder="0" min={0}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                </div>
                <div className="flex items-end">
                  <button onClick={search} disabled={searching}
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-4 py-2 rounded-lg transition cursor-pointer disabled:opacity-50">
                    {searching ? "Searching…" : "Apply Filters"}
                  </button>
                </div>
              </div>
            </div>

            {/* AI summary */}
            {aiSummary && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-slate-300">
                <span className="text-emerald-400 font-medium">🤖 Claude: </span>{aiSummary}
              </div>
            )}

            {/* Results */}
            {players.length > 0 && (
              <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                  <p className="text-sm font-semibold">{players.length} player{players.length !== 1 ? "s" : ""} found</p>
                  <p className="text-xs text-slate-500">Click ✦ to shortlist · ⬇ for PDF report</p>
                </div>
                <div className="divide-y divide-white/5">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition group">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.position} · {p.team_name}{p.age ? ` · ${p.age}y` : ""}</p>
                      </div>
                      <div className="hidden sm:flex gap-4 text-xs text-center shrink-0">
                        <div><p className="font-bold text-emerald-400">{Number(p.avg_rating).toFixed(1)}</p><p className="text-slate-600">Rating</p></div>
                        <div><p className="font-bold text-white">{p.total_goals}</p><p className="text-slate-600">Goals</p></div>
                        <div><p className="font-bold text-white">{p.total_assists}</p><p className="text-slate-600">Assists</p></div>
                        <div><p className="font-bold text-white">{Number(p.avg_pass_accuracy).toFixed(0)}%</p><p className="text-slate-600">Pass%</p></div>
                        <div><p className="font-bold text-white">{p.matches_played}</p><p className="text-slate-600">Matches</p></div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => addToShortlist(p)} disabled={saving === p.id}
                          title="Add to shortlist"
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition text-sm cursor-pointer disabled:opacity-50">
                          {saving === p.id ? "…" : "✦"}
                        </button>
                        <button onClick={() => downloadReport(p.id)} disabled={downloading === p.id}
                          title="Download scout report PDF"
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-sm cursor-pointer disabled:opacity-50">
                          {downloading === p.id ? "…" : "⬇"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {players.length === 0 && !searching && (
              <div className="text-center py-12 text-slate-600 text-sm">
                Use the search bar or filters above to find players.
              </div>
            )}
          </>
        )}

        {tab === "shortlist" && (
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            {shortlist.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <p className="mb-2">Your shortlist is empty.</p>
                <button onClick={() => switchTab("search")} className="text-emerald-400 hover:text-emerald-300 text-xs cursor-pointer">Search players →</button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {shortlist.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{e.name}</p>
                      <p className="text-xs text-slate-500">{e.position} · {e.team_name}</p>
                      {e.notes && <p className="text-xs text-slate-600 mt-0.5 italic">{e.notes}</p>}
                    </div>
                    <div className="hidden sm:flex gap-4 text-xs text-center shrink-0">
                      <div><p className="font-bold text-emerald-400">{Number(e.avg_rating).toFixed(1)}</p><p className="text-slate-600">Rating</p></div>
                      <div><p className="font-bold text-white">{e.total_goals}</p><p className="text-slate-600">Goals</p></div>
                      <div><p className="font-bold text-white">{e.total_assists}</p><p className="text-slate-600">Assists</p></div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => downloadReport(e.player_id)} disabled={downloading === e.player_id}
                        title="Scout PDF"
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-sm cursor-pointer disabled:opacity-50">
                        {downloading === e.player_id ? "…" : "⬇"}
                      </button>
                      <button onClick={() => removeFromShortlist(e.id)}
                        title="Remove"
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition text-sm cursor-pointer">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
