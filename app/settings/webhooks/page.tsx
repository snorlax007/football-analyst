"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Webhook {
  id: number;
  url: string;
  events: string[];
  active: boolean;
  last_fired: string | null;
  created_at: string;
}

const ALL_EVENTS = [
  { id: "match.analysis.completed", label: "Analysis completed", desc: "Fires when AI analysis is generated for a match" },
  { id: "match.live.event", label: "Live match event", desc: "Fires on goals, cards, VAR during live matches" },
  { id: "pre_match.report.generated", label: "Pre-match report", desc: "Fires when a pre-match tactical brief is generated" },
];

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(ALL_EVENTS.map((e) => e.id));
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/webhooks/config")
      .then((r) => r.json())
      .then((d) => setHooks(d.webhooks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleEvent(id: string) {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  async function create() {
    if (!url.trim()) { setError("Enter a webhook URL"); return; }
    if (selectedEvents.length === 0) { setError("Select at least one event"); return; }
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/webhooks/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events: selectedEvents }),
      });
      const data = await res.json() as { error?: string; webhook?: Webhook; secret?: string };
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setCreatedSecret(data.secret!);
      setHooks((prev) => [data.webhook!, ...prev]);
      setUrl("");
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: number) {
    await fetch(`/api/webhooks/config/${id}`, { method: "DELETE" });
    setHooks((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-white text-sm transition-colors">← Dashboard</Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-2xl font-black">Webhooks</h1>
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">Team</span>
        </div>

        <p className="text-slate-400 text-sm">
          Receive real-time POST payloads when events happen in your org.
          Pipe to Slack, Notion, Zapier, or any HTTPS endpoint.
        </p>

        {/* Revealed secret */}
        {createdSecret && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5">
            <p className="text-amber-400 font-semibold text-sm mb-2">✓ Webhook created — save your signing secret now.</p>
            <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-4 py-2.5 font-mono text-xs text-white">
              <span className="flex-1 truncate">{createdSecret}</span>
              <button onClick={() => { navigator.clipboard.writeText(createdSecret); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-xs text-slate-400 hover:text-amber-400 transition shrink-0 cursor-pointer">
                {copied ? "✓" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Verify requests using the <code>X-FA-Signature</code> header (HMAC-SHA256).</p>
            <button onClick={() => setCreatedSecret(null)} className="mt-2 text-xs text-slate-500 hover:text-white transition cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Create form */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
          <h2 className="font-semibold text-sm">Add Webhook Endpoint</h2>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Endpoint URL (HTTPS only)</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/api/football-webhook"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Events to subscribe</label>
            <div className="space-y-2">
              {ALL_EVENTS.map((e) => (
                <label key={e.id} className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={selectedEvents.includes(e.id)} onChange={() => toggleEvent(e.id)}
                    className="mt-0.5 accent-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">{e.label}</p>
                    <p className="text-xs text-slate-500">{e.desc}</p>
                    <code className="text-[10px] text-slate-600">{e.id}</code>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}{" "}
              {error.includes("Team") && <Link href="/pricing" className="underline">Upgrade →</Link>}
            </p>
          )}
          <button onClick={create} disabled={creating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold text-sm transition disabled:opacity-50 cursor-pointer">
            {creating ? "Creating…" : "Add Webhook"}
          </button>
        </div>

        {/* Existing hooks */}
        {(loading || hooks.length > 0) && (
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10">
              <p className="text-sm font-semibold text-slate-400">Active Webhooks</p>
            </div>
            {loading ? (
              <div className="p-5 animate-pulse space-y-3">{[1, 2].map((i) => <div key={i} className="h-12 bg-white/5 rounded" />)}</div>
            ) : (
              <div className="divide-y divide-white/5">
                {hooks.map((h) => (
                  <div key={h.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-mono truncate text-white">{h.url}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {h.events.map((e) => (
                            <span key={e} className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">{e}</span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {h.last_fired ? `Last fired: ${new Date(h.last_fired).toLocaleString()}` : "Never fired"}
                        </p>
                      </div>
                      <button onClick={() => remove(h.id)}
                        className="text-xs text-slate-600 hover:text-red-400 transition shrink-0 cursor-pointer mt-0.5">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payload example */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="font-semibold text-sm mb-3">Example Payload</h2>
          <pre className="bg-slate-900 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">{`{
  "event": "match.analysis.completed",
  "timestamp": "2026-05-01T22:15:00Z",
  "data": {
    "match_id": 1,
    "home_team": "Manchester City",
    "away_team": "Arsenal",
    "score": { "home": 3, "away": 1 },
    "insights": ["...", "..."]
  }
}`}</pre>
          <p className="text-xs text-slate-500 mt-3">
            Verify with <code className="text-emerald-400">X-FA-Signature: sha256=...</code> header using your webhook secret.
          </p>
        </div>

      </main>
    </div>
  );
}
