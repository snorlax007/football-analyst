"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Usage {
  used: number;
  limit: number;
  remaining: number;
}

export default function UsageBar() {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    fetch("/api/user/usage")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setUsage(d); })
      .catch(() => null);
  }, []);

  if (!usage) return null;

  const pct = (usage.used / usage.limit) * 100;
  const atLimit = usage.remaining === 0;

  return (
    <div className={`rounded-xl border p-4 ${atLimit ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/5"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400 font-medium">AI Reports this month</p>
        <span className={`text-xs font-bold tabular-nums ${atLimit ? "text-amber-400" : "text-emerald-400"}`}>
          {usage.used} / {usage.limit}
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${atLimit ? "bg-amber-400" : "bg-emerald-500"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {atLimit ? (
        <p className="text-xs text-amber-400">
          Limit reached.{" "}
          <Link href="/pricing" className="underline hover:text-amber-300">
            Upgrade to Pro
          </Link>{" "}
          for unlimited analyses.
        </p>
      ) : (
        <p className="text-xs text-slate-500">{usage.remaining} free report{usage.remaining !== 1 ? "s" : ""} remaining</p>
      )}
    </div>
  );
}
