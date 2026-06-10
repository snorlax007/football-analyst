import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getUserOrgs } from "@/lib/orgs";
import LogoutButton from "./LogoutButton";

export default async function Header() {
  const session = await getSession();
  const orgs = session ? await getUserOrgs(session.userId) : [];
  const primaryOrg = orgs[0] ?? null;

  return (
    <header className="sticky top-0 z-50 bg-[#06080f]/85 border-b border-[#f0b429]/10 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-black text-sm hover:opacity-80 transition-opacity group">
          <span className="text-xl leading-none animate-float-ball inline-block" style={{ animationDuration: "6s" }}>⚽</span>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="wc-gold-text text-sm font-black tracking-tight">Football AI</span>
            <span className="text-[9px] text-[#f0b429]/40 tracking-[0.2em] uppercase font-semibold leading-none mt-0.5">
              WC 2026 Edition
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 text-sm">
          <Link href="/matches" className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            Matches
          </Link>
          <Link href="/pricing" className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors hidden sm:inline-flex">
            Pricing
          </Link>

          {session ? (
            <>
              <Link href="/scouting" className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors hidden md:inline-flex">
                Scouting
              </Link>
              <Link href="/pre-match" className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors hidden lg:inline-flex">
                Pre-Match
              </Link>
              <Link href="/fantasy" className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors hidden lg:inline-flex">
                Fantasy
              </Link>
              {primaryOrg && (
                <Link
                  href={`/org/${primaryOrg.slug}`}
                  className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors hidden sm:inline-flex items-center gap-1"
                >
                  <span className="text-[#f0b429]/60 text-xs">🏢</span>
                  <span className="max-w-[80px] truncate">{primaryOrg.name}</span>
                </Link>
              )}
              <Link
                href="/dashboard"
                className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-slate-600 text-xs hidden lg:inline px-1">{session.name}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="relative overflow-hidden bg-gradient-to-r from-[#f0b429] to-[#ffd970] hover:from-[#ffd970] hover:to-[#f0b429] text-[#07090f] font-black text-xs px-4 py-1.5 rounded-lg transition-all shimmer-parent"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
