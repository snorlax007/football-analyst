"use client";

import { useState } from "react";

export default function BillingPortalButton() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={openPortal}
      disabled={loading}
      className="text-xs border border-white/20 hover:border-white/40 text-slate-300 px-4 py-2 rounded-lg transition disabled:opacity-50"
    >
      {loading ? "..." : "Manage billing"}
    </button>
  );
}
