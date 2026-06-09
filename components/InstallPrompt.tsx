"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if user dismissed before
    if (localStorage.getItem("pwa-prompt-dismissed") === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setPrompt(null);
    }
  }

  function dismiss() {
    localStorage.setItem("pwa-prompt-dismissed", "1");
    setDismissed(true);
  }

  if (!prompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/60 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">⚽</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Add to Home Screen</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Install Football AI for quick access and offline match reports.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition-colors min-h-[44px]"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="flex-1 border border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-300 text-xs py-2.5 rounded-xl transition-colors min-h-[44px]"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
