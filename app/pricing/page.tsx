import Link from "next/link";
import { getSession } from "@/lib/auth";
import { PLANS } from "@/lib/stripe";

export const metadata = { title: "Pricing — Football AI Analyst · WC 2026 Edition" };

const CHECK = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
       style={{ color: "#f0b429" }}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

export default async function PricingPage() {
  const session = await getSession();

  return (
    <main className="min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase mb-5"
               style={{ background: "rgba(240,180,41,0.1)", border: "1px solid rgba(240,180,41,0.3)", color: "#f0b429" }}>
            🏆 World Cup 2026 Edition
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="wc-gold-text">Simple</span> pricing.<br />
            <span className="text-white">Powerful</span> analysis.
          </h1>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            Follow every World Cup match with AI-powered tactical intelligence.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* Free */}
          <div className="wc-card wc-card-hover rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "rgba(240,180,41,0.5)" }}>
                {PLANS.free.name}
              </p>
              <div className="flex items-end gap-1.5">
                <span className="text-5xl font-black">$0</span>
                <span className="text-slate-500 mb-1.5 text-sm">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PLANS.free.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  {CHECK} {f}
                </li>
              ))}
            </ul>
            {session ? (
              <Link href="/dashboard"
                className="block text-center py-3 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(240,180,41,0.25)", color: "#f0b429" }}>
                Current plan
              </Link>
            ) : (
              <Link href="/register"
                className="block text-center py-3 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(240,180,41,0.25)", color: "#f0b429" }}>
                Get started free
              </Link>
            )}
          </div>

          {/* Pro — featured */}
          <div className="relative rounded-2xl p-8 flex flex-col shimmer-parent overflow-hidden"
               style={{
                 background: "linear-gradient(145deg, rgba(240,180,41,0.12), rgba(240,180,41,0.05))",
                 border: "1px solid rgba(240,180,41,0.45)",
                 boxShadow: "0 0 40px -12px rgba(240,180,41,0.25)",
               }}>
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
              <span className="text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase"
                    style={{ background: "linear-gradient(135deg,#c97c1a,#f0b429,#ffd970)", color: "#07090f" }}>
                Most Popular
              </span>
            </div>
            <div className="mb-6 mt-2">
              <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "#f0b429" }}>
                {PLANS.pro.name}
              </p>
              <div className="flex items-end gap-1.5">
                <span className="text-5xl font-black wc-gold-text">${PLANS.pro.price}</span>
                <span className="text-slate-500 mb-1.5 text-sm">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PLANS.pro.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-200">
                  {CHECK} {f}
                </li>
              ))}
            </ul>
            <UpgradeButton tier="pro" label="Upgrade to Pro" session={!!session} featured />
          </div>

          {/* Team */}
          <div className="wc-card wc-card-hover rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "rgba(240,180,41,0.5)" }}>
                {PLANS.team.name}
              </p>
              <div className="flex items-end gap-1.5">
                <span className="text-5xl font-black">${PLANS.team.price}</span>
                <span className="text-slate-500 mb-1.5 text-sm">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PLANS.team.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  {CHECK} {f}
                </li>
              ))}
            </ul>
            <UpgradeButton tier="team" label="Upgrade to Team" session={!!session} />
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-10">
          All plans include a 7-day free trial · Cancel anytime · Prices in USD
        </p>
      </div>
    </main>
  );
}

function UpgradeButton({
  tier, label, session, featured = false,
}: {
  tier: "pro" | "team";
  label: string;
  session: boolean;
  featured?: boolean;
}) {
  const baseClass = "block w-full text-center py-3 rounded-xl text-sm font-black transition-all shimmer-parent relative overflow-hidden";

  if (!session) {
    return (
      <Link
        href="/register?next=/pricing"
        className={baseClass}
        style={featured
          ? { background: "linear-gradient(135deg,#c97c1a,#f0b429,#ffd970)", color: "#07090f" }
          : { border: "1px solid rgba(240,180,41,0.3)", color: "#f0b429" }}
      >
        Start free trial
      </Link>
    );
  }
  return (
    <form action="/api/billing/checkout" method="POST">
      <input type="hidden" name="tier" value={tier} />
      <button
        type="submit"
        className={`${baseClass} cursor-pointer`}
        style={featured
          ? { background: "linear-gradient(135deg,#c97c1a,#f0b429,#ffd970)", color: "#07090f" }
          : { border: "1px solid rgba(240,180,41,0.3)", color: "#f0b429" }}
      >
        {label}
      </button>
    </form>
  );
}
