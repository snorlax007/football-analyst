import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 border-b border-white/5 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-sm hover:text-emerald-400 transition-colors">
          <span className="text-emerald-400">⚽</span>
          <span className="hidden sm:inline text-white">Football AI</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link href="/matches" className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            Matches
          </Link>

          {session ? (
            <>
              <Link href="/dashboard" className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                Dashboard
              </Link>
              <span className="text-slate-600 text-xs hidden sm:inline">
                {session.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs px-4 py-1.5 rounded-lg transition-colors"
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
