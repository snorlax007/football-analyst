"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InviteInfo {
  orgName: string;
  orgSlug: string;
  email: string;
  role: string;
  expiresAt: string;
}

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInfo(d);
      })
      .catch(() => setError("Failed to load invitation"));
  }, [token]);

  async function accept() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?next=/invite/${token}`);
          return;
        }
        throw new Error(data.error ?? "Failed to accept");
      }
      setAccepted(true);
      setTimeout(() => router.push(`/org/${data.orgSlug}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-xl font-bold text-white mb-2">Invitation unavailable</h1>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm">Go home →</Link>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading invitation…</div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">✅</p>
          <h1 className="text-xl font-bold text-white mb-2">You joined {info.orgName}!</h1>
          <p className="text-slate-400 text-sm">Redirecting to org dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-8 text-center">
          <p className="text-4xl mb-4">🏟️</p>
          <h1 className="text-xl font-black text-white mb-1">Join {info.orgName}</h1>
          <p className="text-slate-400 text-sm mb-1">
            You were invited as{" "}
            <span className="text-white font-semibold capitalize">{info.role}</span>
          </p>
          <p className="text-slate-600 text-xs mb-6">{info.email}</p>

          <button
            onClick={accept}
            disabled={accepting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold text-sm tracking-wide transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {accepting ? "Joining…" : `Accept invitation`}
          </button>

          <p className="text-slate-600 text-xs mt-4">
            Expires {new Date(info.expiresAt).toLocaleDateString()}
          </p>
        </div>

        <p className="text-center mt-4">
          <Link href="/login" className="text-slate-500 hover:text-slate-400 text-xs">
            Need to sign in first?
          </Link>
        </p>
      </div>
    </div>
  );
}
