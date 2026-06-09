"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ApiKey {
  id: number;
  key_prefix: string;
  name: string;
  tier: string;
  last_used_at: string | null;
  created_at: string;
  requests_today: number;
  dailyLimit: number;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function createKey() {
    if (!newKeyName.trim()) { setError("Give your key a name"); return; }
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json() as { error?: string; upgradeUrl?: string; key?: string; prefix?: string; name?: string; tier?: string };
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setCreatedKey(data.key!);
      setKeys((prev) => [{
        id: Date.now(),
        key_prefix: data.prefix!,
        name: data.name!,
        tier: data.tier!,
        last_used_at: null,
        created_at: new Date().toISOString(),
        requests_today: 0,
        dailyLimit: data.tier === "team" ? 1000 : 100,
      }, ...prev]);
      setNewKeyName("");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: number) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function copyKey() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-white text-sm transition-colors">← Dashboard</Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-2xl font-black">API Keys</h1>
        </div>

        <p className="text-slate-400 text-sm">
          Use API keys to access the Football AI REST API. Keys inherit your subscription tier and rate limits.{" "}
          <Link href="/docs" className="text-emerald-400 hover:underline">View API docs →</Link>
        </p>

        {/* New key revealed */}
        {createdKey && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5">
            <p className="text-emerald-400 font-semibold text-sm mb-2">✓ API key created — copy it now, it won't be shown again.</p>
            <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-4 py-2.5 font-mono text-sm text-white">
              <span className="flex-1 truncate">{createdKey}</span>
              <button onClick={copyKey}
                className="text-xs text-slate-400 hover:text-emerald-400 transition shrink-0 cursor-pointer">
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <button onClick={() => setCreatedKey(null)} className="mt-2 text-xs text-slate-500 hover:text-white transition cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Create key */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="font-semibold text-sm mb-3">Create New Key</h2>
          <div className="flex gap-2">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              placeholder="e.g. Production, My App"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
            <button onClick={createKey} disabled={creating}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-5 py-2 rounded-xl transition disabled:opacity-50 cursor-pointer">
              {creating ? "…" : "Create"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}{" "}
              {error.includes("Pro") && <Link href="/pricing" className="underline">Upgrade →</Link>}
            </p>
          )}
        </div>

        {/* Key list */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-sm font-semibold text-slate-400">{loading ? "Loading…" : `${keys.length} active key${keys.length !== 1 ? "s" : ""}`}</p>
          </div>
          {keys.length === 0 && !loading ? (
            <div className="text-center py-10 text-slate-600 text-sm">No API keys yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{k.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${k.tier === "team" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {k.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">{k.key_prefix}…</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-600">
                        {k.requests_today} / {k.dailyLimit} req today
                      </span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className="h-full bg-emerald-500/60 rounded-full"
                          style={{ width: `${Math.min((k.requests_today / k.dailyLimit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-600">
                      {k.last_used_at ? `Used ${new Date(k.last_used_at).toLocaleDateString()}` : "Never used"}
                    </p>
                    <button onClick={() => revokeKey(k.id)}
                      className="mt-1 text-xs text-slate-600 hover:text-red-400 transition cursor-pointer">
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick start */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
          <h2 className="font-semibold text-sm">Quick Start</h2>
          <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
            <p className="text-slate-500"># Get match analysis</p>
            <p>curl https://your-domain.com/api/v1/match/1/analysis \</p>
            <p>{"  "}-H <span className="text-emerald-400">"Authorization: Bearer faa_your_key"</span></p>
          </div>
          <Link href="/docs" className="inline-block text-xs text-emerald-400 hover:underline">
            Full API documentation →
          </Link>
        </div>

      </main>
    </div>
  );
}
