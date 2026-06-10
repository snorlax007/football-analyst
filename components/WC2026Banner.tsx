"use client";

import { useState, useEffect } from "react";

const TICKER_ITEMS = [
  "🇺🇸 USA · 🇨🇦 Canada · 🇲🇽 Mexico",
  "48 Teams · 104 Matches · 16 Host Cities",
  "June 11 – July 19, 2026",
  "Group Stage · Round of 32 · Quarter-Finals · Semi-Finals · Final",
  "Follow every match with AI-powered tactical analysis",
  "Live scores · xG tracking · Formation intel · Scouting reports",
  "🏆 The Biggest World Cup in History",
];

function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const target = new Date("2026-06-11T18:00:00Z").getTime();
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        return;
      }
      const days  = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins  = Math.floor((diff % 3600000)  / 60000);
      const secs  = Math.floor((diff % 60000)     / 1000);
      setTimeLeft({ days, hours, mins, secs });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#f0b429]">
      {timeLeft.days > 0 && (
        <>
          <span className="tabular-nums">{timeLeft.days}d</span>
          <span className="text-[#f0b429]/40">·</span>
        </>
      )}
      <span className="tabular-nums">{pad(timeLeft.hours)}h</span>
      <span className="text-[#f0b429]/40">:</span>
      <span className="tabular-nums">{pad(timeLeft.mins)}m</span>
      <span className="text-[#f0b429]/40">:</span>
      <span className="tabular-nums">{pad(timeLeft.secs)}s</span>
    </div>
  );
}

export default function WC2026Banner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("wc2026-banner-v2")) {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="relative overflow-hidden border-b border-[#f0b429]/20 bg-gradient-to-r from-[#0f0900] via-[#1a1000] to-[#0f0900]">
      {/* shimmer */}
      <div className="absolute inset-0 shimmer-parent pointer-events-none" />

      {/* top strip — countdown */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-base leading-none">🏆</span>
          <span className="text-[#f0b429] font-black text-xs tracking-wider uppercase leading-none hidden xs:block">
            FIFA World Cup 2026
          </span>
          <span className="text-[#f0b429]/30 text-xs hidden sm:inline">·</span>
          <span className="text-[#f0b429]/60 text-xs hidden sm:inline">Kicks off</span>
          <Countdown />
        </div>

        {/* ticker */}
        <div className="flex-1 overflow-hidden min-w-0 hidden md:block">
          <div className="flex whitespace-nowrap animate-ticker">
            {doubled.map((item, i) => (
              <span key={i} className="text-[#f0b429]/50 text-xs px-8 shrink-0">
                {item}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem("wc2026-banner-v2", "1");
          }}
          className="text-[#f0b429]/30 hover:text-[#f0b429]/70 text-sm transition-colors shrink-0 ml-2"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
