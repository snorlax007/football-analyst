"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Team {
  id: number;
  name: string;
  short_name: string;
  logo_url: string | null;
  league: string | null;
}

interface MatchRow {
  id: number;
  home_score: number;
  away_score: number;
  status: string;
  match_date: string;
  league: string;
  home_name: string;
  away_name: string;
  home_team_id: number;
}

interface SeasonStat {
  label: string;
  value: string | number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className ?? ""}`} />;
}

function FollowButton({ teamId, initialFollowing }: { teamId: number; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const method = following ? "DELETE" : "POST";
    const res = await fetch(`/api/team/${teamId}/follow`, { method });
    if (res.ok) {
      const data = await res.json();
      setFollowing(data.following);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 ${
        following
          ? "bg-white/10 hover:bg-white/15 text-white border border-white/20"
          : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
      }`}
    >
      {loading ? "…" : following ? "Following ✓" : "Follow team"}
    </button>
  );
}

export default function TeamClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [seasonStats, setSeasonStats] = useState<SeasonStat[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/teams/${id}`).then((r) => r.json()),
      fetch(`/api/teams/${id}/matches`).then((r) => r.json()),
      fetch(`/api/teams/${id}/season-stats`).then((r) => r.json()),
      fetch(`/api/user/teams`).then((r) => r.json()),
    ])
      .then(([teamData, matchData, statsData, followedData]) => {
        if (teamData.error) { setError(teamData.error); return; }
        setTeam(teamData.team);
        setMatches(matchData.matches ?? []);
        setSeasonStats(statsData.stats ?? []);
        const followedIds: number[] = (followedData.teams ?? []).map((t: { id: number }) => t.id);
        setFollowing(followedIds.includes(parseInt(id)));
      })
      .catch(() => setError("Failed to load team"))
      .finally(() => setLoading(false));
  }, [id]);

  const statusLabel: Record<string, string> = { finished: "FT", live: "Live", scheduled: "vs" };
  const statusColor: Record<string, string> = {
    finished: "bg-slate-700 text-slate-400",
    live: "bg-emerald-500/20 text-emerald-400",
    scheduled: "bg-blue-500/20 text-blue-400",
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <Link href="/matches" className="text-emerald-400 text-sm">← Back to matches</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Team Header */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          {loading ? (
            <Skeleton className="h-10 w-48" />
          ) : team ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black">{team.name}</h1>
                {team.league && <p className="text-slate-500 text-sm mt-1">{team.league}</p>}
              </div>
              <FollowButton teamId={team.id} initialFollowing={following} />
            </div>
          ) : null}
        </div>

        {/* Season Stats */}
        {(loading || seasonStats.length > 0) && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h2 className="font-bold text-base mb-4">📊 Season Stats</h2>
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {seasonStats.map((s) => (
                  <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-emerald-400">{s.value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Matches */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">Recent Matches</h2>
            <Link href="/matches" className="text-xs text-slate-500 hover:text-slate-400">All matches →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : matches.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No matches recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => {
                const isHome = m.home_team_id === team?.id;
                const ourScore = isHome ? m.home_score : m.away_score;
                const theirScore = isHome ? m.away_score : m.home_score;
                const opponent = isHome ? m.away_name : m.home_name;
                const result = m.status === "finished"
                  ? ourScore > theirScore ? "W" : ourScore < theirScore ? "L" : "D"
                  : null;
                const resultColor = result === "W" ? "text-emerald-400" : result === "L" ? "text-red-400" : "text-slate-400";

                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {result && <span className={`text-xs font-black ${resultColor}`}>{result}</span>}
                        <p className="text-sm font-semibold">
                          {isHome ? "vs" : "@"} {opponent}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{m.league}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {m.status === "scheduled" ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[m.status]}`}>Upcoming</span>
                      ) : (
                        <p className="text-base font-black text-emerald-400">{ourScore}–{theirScore}</p>
                      )}
                      <p className="text-xs text-slate-600 mt-0.5">
                        {new Date(m.match_date).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
