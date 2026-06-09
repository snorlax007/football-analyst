"use client";

import { useEffect, useState } from "react";

interface TrendPoint {
  matchId: number;
  date: string;
  opponent: string;
  result: "W" | "L" | "D";
  gf: number;
  ga: number;
  xg: number | null;
  possession: number | null;
  pressIntensity: number | null;
  passAccuracy: number | null;
  shots: number | null;
}

interface Avgs {
  possession: number | null;
  xg: number | null;
  pressIntensity: number | null;
  passAccuracy: number | null;
  shots: number | null;
}

interface TrendsData {
  teamName: string;
  trendPoints: TrendPoint[];
  teamAvg: Avgs;
  leagueAvg: Avgs;
  narrative: string;
}

// Mini SVG line chart
function LineChart({ points, color, label, max, format }: {
  points: (number | null)[];
  color: string;
  label: string;
  max: number;
  format: (n: number) => string;
}) {
  const W = 280; const H = 64; const PAD = 8;
  const valid = points.filter((p): p is number => p !== null);
  if (valid.length < 2) return (
    <div className="text-center text-xs text-slate-600 py-4">Not enough data</div>
  );

  const xs = points.map((_, i) => PAD + (i / (points.length - 1)) * (W - PAD * 2));
  const ys = points.map((p) => p === null ? null : H - PAD - ((p / max) * (H - PAD * 2)));

  const pathParts: string[] = [];
  let move = true;
  for (let i = 0; i < xs.length; i++) {
    if (ys[i] === null) { move = true; continue; }
    pathParts.push(move ? `M${xs[i]},${ys[i]}` : `L${xs[i]},${ys[i]}`);
    move = false;
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path d={pathParts.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {xs.map((x, i) => ys[i] !== null && (
          <circle key={i} cx={x} cy={ys[i]!} r={3} fill={color} />
        ))}
        {/* Last value label */}
        {valid.length > 0 && (
          <text x={W - PAD} y={(ys.find((y, i) => ys[ys.length - 1 - i] !== null) ?? 0)! - 4}
            textAnchor="end" fontSize={9} fill={color}>
            {format(valid[valid.length - 1])}
          </text>
        )}
      </svg>
    </div>
  );
}

// Benchmark bar: team vs league
function BenchmarkBar({ label, team, league, max, format }: {
  label: string; team: number | null; league: number | null; max: number; format: (n: number) => string;
}) {
  if (team === null) return null;
  const teamPct = Math.min((team / max) * 100, 100);
  const leaguePct = league ? Math.min((league / max) * 100, 100) : 0;
  const better = league ? team >= league : true;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${better ? "text-emerald-400" : "text-red-400"}`}>{format(team)}</span>
          {league && <span className="text-slate-600">vs {format(league)} avg</span>}
        </div>
      </div>
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
        {/* League average marker */}
        {league && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10" style={{ left: `${leaguePct}%` }} />
        )}
        <div
          className={`h-full rounded-full transition-all duration-700 ${better ? "bg-emerald-500" : "bg-red-500"}`}
          style={{ width: `${teamPct}%` }}
        />
      </div>
    </div>
  );
}

export default function SeasonTrends({ teamId }: { teamId: string }) {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/team/${teamId}/trends`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 animate-pulse space-y-3">
        <div className="h-5 w-48 bg-white/10 rounded" />
        <div className="h-16 bg-white/5 rounded" />
        <div className="h-16 bg-white/5 rounded" />
      </div>
    );
  }

  if (!data || data.trendPoints.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center text-slate-500 text-sm py-10">
        No season trend data available yet.
      </div>
    );
  }

  const { trendPoints: pts, teamAvg, leagueAvg, narrative } = data;

  const resultColor: Record<string, string> = { W: "#10b981", D: "#f59e0b", L: "#ef4444" };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6">
      <h3 className="text-emerald-400 font-semibold text-base">📈 Season Trends</h3>

      {/* Result ticker */}
      <div className="flex flex-wrap gap-1.5">
        {pts.map((p) => (
          <div key={p.matchId} title={`${p.result} ${p.gf}-${p.ga} vs ${p.opponent}`}
            className="flex flex-col items-center gap-0.5 cursor-default">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: resultColor[p.result] + "33", border: `1.5px solid ${resultColor[p.result]}66`, color: resultColor[p.result] }}>
              {p.result}
            </div>
            <span className="text-[8px] text-slate-600">{p.gf}-{p.ga}</span>
          </div>
        ))}
      </div>

      {/* Trend charts */}
      {pts.some((p) => p.xg !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <LineChart
            points={pts.map((p) => p.xg)}
            color="#10b981" label="xG per match" max={4}
            format={(n) => n.toFixed(2)}
          />
          <LineChart
            points={pts.map((p) => p.possession)}
            color="#818cf8" label="Possession %" max={100}
            format={(n) => `${n.toFixed(0)}%`}
          />
          <LineChart
            points={pts.map((p) => p.pressIntensity)}
            color="#f59e0b" label="Press Intensity %" max={100}
            format={(n) => `${n.toFixed(0)}%`}
          />
          <LineChart
            points={pts.map((p) => p.passAccuracy)}
            color="#38bdf8" label="Pass Accuracy %" max={100}
            format={(n) => `${n.toFixed(0)}%`}
          />
        </div>
      )}

      {/* Benchmark vs league */}
      {(teamAvg.xg !== null || teamAvg.possession !== null) && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Benchmark vs League Average</p>
          <BenchmarkBar label="xG per game" team={teamAvg.xg} league={leagueAvg.xg} max={4} format={(n) => n.toFixed(2)} />
          <BenchmarkBar label="Possession" team={teamAvg.possession} league={leagueAvg.possession} max={100} format={(n) => `${n}%`} />
          <BenchmarkBar label="Press Intensity" team={teamAvg.pressIntensity} league={leagueAvg.pressIntensity} max={100} format={(n) => `${n}%`} />
          <BenchmarkBar label="Pass Accuracy" team={teamAvg.passAccuracy} league={leagueAvg.passAccuracy} max={100} format={(n) => `${n}%`} />
          <BenchmarkBar label="Shots per game" team={teamAvg.shots} league={leagueAvg.shots} max={25} format={(n) => String(n)} />
        </div>
      )}

      {/* AI Narrative */}
      {narrative && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 mb-1 font-medium">🤖 AI Season Read</p>
          <p className="text-sm text-slate-300 leading-relaxed">{narrative}</p>
        </div>
      )}
    </div>
  );
}
