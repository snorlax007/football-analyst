"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/25 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
    >
      Sign out
    </button>
  );
}
