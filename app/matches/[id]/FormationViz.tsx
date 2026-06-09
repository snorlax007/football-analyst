"use client";

import { useEffect, useState } from "react";

interface Player {
  id: number;
  name: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  coords: [number, number];
  team_name: string;
}

interface TeamFormation {
  id: number;
  name: string;
  formation: string;
  players: Player[];
}

interface FormationData {
  matchId: number;
  home: TeamFormation;
  away: TeamFormation;
  tacticalDescription: string;
}

function PitchSVG({ home, away }: { home: TeamFormation; away: TeamFormation }) {
  const W = 360;
  const H = 540;
  const [hovered, setHovered] = useState<Player | null>(null);

  // Away players are mirrored (y flipped) since they attack from opposite end
  const awayMirrored = away.players.map((p) => ({
    ...p,
    coords: [p.coords[0], 100 - p.coords[1]] as [number, number],
  }));

  function px(x: number) { return (x / 100) * W; }
  function py(y: number) { return (y / 100) * H; }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto rounded-xl overflow-hidden" style={{ maxHeight: 480 }}>
        {/* Pitch background */}
        <rect width={W} height={H} fill="#1a472a" />
        {/* Pitch stripes */}
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={0} y={i * 60} width={W} height={30} fill="rgba(0,0,0,0.08)" />
        ))}
        {/* Outline */}
        <rect x={20} y={20} width={W - 40} height={H - 40} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} rx={4} />
        {/* Centre line */}
        <line x1={20} y1={H / 2} x2={W - 20} y2={H / 2} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
        {/* Centre circle */}
        <circle cx={W / 2} cy={H / 2} r={50} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
        <circle cx={W / 2} cy={H / 2} r={3} fill="rgba(255,255,255,0.5)" />
        {/* Home penalty box */}
        <rect x={80} y={H - 120} width={200} height={100} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
        <rect x={120} y={H - 60} width={120} height={40} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
        {/* Away penalty box */}
        <rect x={80} y={20} width={200} height={100} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
        <rect x={120} y={20} width={120} height={40} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />

        {/* Home heatmap blobs (subtle) */}
        {home.players.map((p) => (
          <circle key={`hh-${p.id}`}
            cx={px(p.coords[0])} cy={py(p.coords[1])}
            r={28} fill="rgba(16,185,129,0.12)" />
        ))}
        {/* Away heatmap blobs */}
        {awayMirrored.map((p) => (
          <circle key={`ah-${p.id}`}
            cx={px(p.coords[0])} cy={py(p.coords[1])}
            r={28} fill="rgba(99,102,241,0.12)" />
        ))}

        {/* Home players (emerald) */}
        {home.players.map((p) => (
          <g key={`hp-${p.id}`}
            onMouseEnter={() => setHovered(p)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}>
            <circle cx={px(p.coords[0])} cy={py(p.coords[1])} r={16} fill="#065f46" stroke="#10b981" strokeWidth={2} />
            {p.goals > 0 && <circle cx={px(p.coords[0]) + 10} cy={py(p.coords[1]) - 10} r={6} fill="#fbbf24" />}
            <text x={px(p.coords[0])} y={py(p.coords[1]) + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
              {p.name.split(" ").pop()?.slice(0, 6)}
            </text>
            <text x={px(p.coords[0])} y={py(p.coords[1]) + 26} textAnchor="middle" fontSize={8} fill="#6ee7b7">
              {Number(p.rating).toFixed(1)}
            </text>
          </g>
        ))}

        {/* Away players (indigo) */}
        {awayMirrored.map((p) => (
          <g key={`ap-${p.id}`}
            onMouseEnter={() => setHovered(p)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}>
            <circle cx={px(p.coords[0])} cy={py(p.coords[1])} r={16} fill="#1e1b4b" stroke="#818cf8" strokeWidth={2} />
            {p.goals > 0 && <circle cx={px(p.coords[0]) + 10} cy={py(p.coords[1]) - 10} r={6} fill="#fbbf24" />}
            <text x={px(p.coords[0])} y={py(p.coords[1]) + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
              {p.name.split(" ").pop()?.slice(0, 6)}
            </text>
            <text x={px(p.coords[0])} y={py(p.coords[1]) + 26} textAnchor="middle" fontSize={8} fill="#a5b4fc">
              {Number(p.rating).toFixed(1)}
            </text>
          </g>
        ))}
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-center shadow-xl pointer-events-none z-10 min-w-[140px]">
          <p className="font-bold text-white">{hovered.name}</p>
          <p className="text-slate-400">{hovered.position} · {hovered.team_name}</p>
          <div className="flex justify-center gap-3 mt-1.5 text-[10px]">
            <span className="text-emerald-400">⭐ {Number(hovered.rating).toFixed(1)}</span>
            {hovered.goals > 0 && <span className="text-yellow-400">⚽ {hovered.goals}</span>}
            {hovered.assists > 0 && <span className="text-blue-400">🅰 {hovered.assists}</span>}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-emerald-500 bg-emerald-900" />
          <span className="text-slate-400">{home.name} ({home.formation})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-indigo-400 bg-indigo-900" />
          <span className="text-slate-400">{away.name} ({away.formation})</span>
        </span>
      </div>
    </div>
  );
}

export default function FormationViz({ matchId }: { matchId: string }) {
  const [data, setData] = useState<FormationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/formation/${matchId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 animate-pulse">
        <div className="h-6 w-40 bg-white/10 rounded mb-4" />
        <div className="h-80 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!data || (data.home.players.length === 0 && data.away.players.length === 0)) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center text-slate-500 text-sm py-12">
        No player position data available for this match.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-5">
      <div>
        <h3 className="text-emerald-400 font-semibold text-base">🗺 Tactical Formation</h3>
        <p className="text-slate-500 text-xs mt-0.5">Hover players for stats · yellow dot = goal</p>
      </div>

      <PitchSVG home={data.home} away={data.away} />

      {data.tacticalDescription && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 mb-1 font-medium">🤖 Claude Tactical Read</p>
          <p className="text-sm text-slate-300 leading-relaxed">{data.tacticalDescription}</p>
        </div>
      )}
    </div>
  );
}
