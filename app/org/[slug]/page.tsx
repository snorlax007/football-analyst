"use client";

import { useEffect, useState, use, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type OrgRole = "owner" | "analyst" | "viewer";

interface Member {
  user_id: string;
  name: string;
  email: string;
  role: OrgRole;
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  token: string;
  expires_at: string;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  myRole: OrgRole;
  members: Member[];
  invitations: Invitation[];
  usage: { used: number; limit: number; remaining: number };
  recentActivity: {
    created_at: string;
    home_name: string;
    away_name: string;
    home_score: number;
    away_score: number;
    league: string;
    match_id: number;
  }[];
}

const ROLE_BADGE: Record<OrgRole, string> = {
  owner: "bg-emerald-500/20 text-emerald-400",
  analyst: "bg-blue-500/20 text-blue-400",
  viewer: "bg-slate-700 text-slate-400",
};

export default function OrgDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"analyst" | "viewer">("analyst");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function loadOrg() {
    const res = await fetch(`/api/org/${slug}`);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to load organization");
      setLoading(false);
      return;
    }
    setOrg(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadOrg(); }, [slug]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteLink(null);
    try {
      const res = await fetch(`/api/org/${slug}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invite failed");
      setInviteLink(data.inviteUrl);
      setInviteEmail("");
      loadOrg();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/org/${slug}/invite/${id}`, { method: "DELETE" });
    loadOrg();
  }

  async function removeMember(userId: string) {
    await fetch(`/api/org/${slug}/members/${userId}`, { method: "DELETE" });
    loadOrg();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/dashboard" className="text-emerald-400 text-sm hover:text-emerald-300">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  if (!org) return null;

  const usagePct = (org.usage.used / org.usage.limit) * 100;
  const atLimit = org.usage.remaining === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black">{org.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-widest ${ROLE_BADGE[org.myRole]}`}>
                {org.myRole}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">{org.members.length} member{org.members.length !== 1 ? "s" : ""} · /{slug}</p>
          </div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
            ← Dashboard
          </Link>
        </div>

        {/* Usage + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Shared AI Quota</p>
              <span className={`text-sm font-bold tabular-nums ${atLimit ? "text-amber-400" : "text-emerald-400"}`}>
                {org.usage.used} / {org.usage.limit}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${atLimit ? "bg-amber-400" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(usagePct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">
              {atLimit ? "Monthly limit reached — upgrade for more" : `${org.usage.remaining} org reports remaining this month`}
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
            <p className="text-3xl font-black text-white">{org.members.length}</p>
            <p className="text-xs text-slate-500 mt-1">Members</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Members */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h2 className="font-bold text-base mb-4">Members</h2>
            <div className="space-y-3">
              {org.members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-slate-500 truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${ROLE_BADGE[m.role]}`}>
                      {m.role}
                    </span>
                    {org.myRole === "owner" && m.role !== "owner" && (
                      <button
                        onClick={() => removeMember(m.user_id)}
                        className="text-slate-600 hover:text-red-400 text-xs transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invite + Pending Invitations */}
          <div className="space-y-4">
            {org.myRole === "owner" && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <h2 className="font-bold text-base mb-4">Invite Member</h2>
                <form onSubmit={handleInvite} className="space-y-3">
                  {inviteError && (
                    <p className="text-red-400 text-xs">{inviteError}</p>
                  )}
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="colleague@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <div className="flex gap-2">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "analyst" | "viewer")}
                      className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                    >
                      <option value="analyst">Analyst</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {inviting ? "…" : "Invite"}
                    </button>
                  </div>
                </form>

                {inviteLink && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-xs text-emerald-400 font-medium mb-1.5">Share this link:</p>
                    <p className="text-xs text-slate-300 break-all font-mono">{inviteLink}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(inviteLink); }}
                      className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      Copy link
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pending invitations */}
            {org.myRole === "owner" && org.invitations.length > 0 && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <h2 className="font-bold text-sm mb-3">Pending Invitations</h2>
                <div className="space-y-2">
                  {org.invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{inv.email}</p>
                        <p className="text-[10px] text-slate-600 capitalize">{inv.role}</p>
                      </div>
                      <button
                        onClick={() => revokeInvite(inv.id)}
                        className="text-slate-600 hover:text-red-400 text-xs transition-colors flex-shrink-0 cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        {org.recentActivity.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h2 className="font-bold text-base mb-4">Recent Analyses</h2>
            <div className="space-y-2">
              {org.recentActivity.map((a, i) => (
                <Link
                  key={i}
                  href={`/matches/${a.match_id}`}
                  className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {a.home_name} {a.home_score}–{a.away_score} {a.away_name}
                    </p>
                    <p className="text-xs text-slate-500">{a.league}</p>
                  </div>
                  <p className="text-xs text-slate-600 group-hover:text-emerald-400 transition-colors">
                    {new Date(a.created_at).toLocaleDateString()} →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
