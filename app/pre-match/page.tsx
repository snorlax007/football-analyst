"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Team { id: number; name: string; short_name: string; }
interface ReportEntry { id: number; home_team_name: string; away_team_name: string; match_date: string | null; created_at: string; }

function MarkdownView({ md }: { md: string }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {md.split("\n").map((line, i) => {
        if (line.startsWith("# ")) return <h2 key={i} className="text-xl font-black text-emerald-400 mt-2 mb-1">{line.slice(2)}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className="text-base font-bold text-white mt-4 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-white">{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <div key={i} className="h-2" />;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={i} className="text-slate-300">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part)}
          </p>
        );
      })}
    </div>
  );
}

export default function PreMatchPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<{ reportId: number; reportMd: string; homeName: string; awayName: string } | null>(null);
  const [error, setError] = useState("");
  const [pastReports, setPastReports] = useState<ReportEntry[]>([]);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/teams/list").then((r) => r.json()).then((d) => setTeams(d.teams ?? [])).catch(() => {});
    fetch("/api/pre-match").then((r) => r.json()).then((d) => setPastReports(d.reports ?? [])).catch(() => {});
  }, []);

  async function generate() {
    if (!homeId || !awayId) { setError("Select both teams"); return; }
    if (homeId === awayId) { setError("Home and away teams must be different"); return; }
    setGenerating(true); setError(""); setReport(null);
    try {
      const res = await fetch("/api/pre-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeTeamId: parseInt(homeId), awayTeamId: parseInt(awayId), matchDate: matchDate || undefined }),
      });
      const data = await res.json() as { error?: string; upgradeUrl?: string; reportId: number; reportMd: string; homeName: string; awayName: string };
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setReport(data);
      setPastReports((prev) => [{
        id: data.reportId,
        home_team_name: data.homeName,
        away_team_name: data.awayName,
        match_date: matchDate || null,
        created_at: new Date().toISOString(),
      }, ...prev]);
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPdf(reportId: number) {
    setDownloading(reportId);
    try {
      const res = await fetch(`/api/report/pre-match/${reportId}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `pre-match-report-${reportId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-white text-sm transition-colors">← Dashboard</Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-2xl font-black">Pre-Match Reports</h1>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Pro+</span>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
          <p className="text-sm text-slate-400">Select two teams to generate a Claude-powered tactical brief with last-5 form analysis.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Home Team</label>
              <select value={homeId} onChange={(e) => setHomeId(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="">Select team…</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Away Team</label>
              <select value={awayId} onChange={(e) => setAwayId(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="">Select team…</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Match Date (optional)</label>
            <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
          </div>

          {error && <p className="text-red-400 text-sm">{error} {error.includes("Pro") && <Link href="/pricing" className="underline">Upgrade →</Link>}</p>}

          <button onClick={generate} disabled={generating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold text-sm transition disabled:opacity-50 cursor-pointer">
            {generating ? "Generating with Claude…" : "Generate Pre-Match Report"}
          </button>
        </div>

        {/* Generated report */}
        {report && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">{report.homeName} vs {report.awayName}</h2>
              <button onClick={() => downloadPdf(report.reportId)} disabled={downloading === report.reportId}
                className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50">
                {downloading === report.reportId ? "…" : "⬇ PDF"}
              </button>
            </div>
            <MarkdownView md={report.reportMd} />
          </div>
        )}

        {/* Past reports */}
        {pastReports.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10">
              <p className="text-sm font-semibold text-slate-400">Past Reports</p>
            </div>
            <div className="divide-y divide-white/5">
              {pastReports.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{r.home_team_name} vs {r.away_team_name}</p>
                    <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}{r.match_date ? ` · Match: ${r.match_date}` : ""}</p>
                  </div>
                  <button onClick={() => downloadPdf(r.id)} disabled={downloading === r.id}
                    className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer disabled:opacity-50">
                    {downloading === r.id ? "…" : "⬇ PDF"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
