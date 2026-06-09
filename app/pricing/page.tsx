import Link from "next/link";
import { getSession } from "@/lib/auth";
import { PLANS } from "@/lib/stripe";

export const metadata = { title: "Pricing — Football AI Analyst" };

const CHECK = (
  <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default async function PricingPage() {
  const session = await getSession();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-xl text-gray-400">
            Start free. Upgrade when you need more power.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Free */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">{PLANS.free.name}</h2>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-400 mb-1">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PLANS.free.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  {CHECK}
                  {f}
                </li>
              ))}
            </ul>
            {session ? (
              <Link
                href="/dashboard"
                className="block text-center py-3 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 transition"
              >
                Current plan
              </Link>
            ) : (
              <Link
                href="/register"
                className="block text-center py-3 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 transition"
              >
                Get started free
              </Link>
            )}
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-emerald-500 bg-gray-900 p-8 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </span>
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">{PLANS.pro.name}</h2>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">${PLANS.pro.price}</span>
                <span className="text-gray-400 mb-1">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PLANS.pro.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  {CHECK}
                  {f}
                </li>
              ))}
            </ul>
            <UpgradeButton tier="pro" label="Upgrade to Pro" session={!!session} />
          </div>

          {/* Team */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">{PLANS.team.name}</h2>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">${PLANS.team.price}</span>
                <span className="text-gray-400 mb-1">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PLANS.team.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  {CHECK}
                  {f}
                </li>
              ))}
            </ul>
            <UpgradeButton tier="team" label="Upgrade to Team" session={!!session} />
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-12">
          All plans include a 7-day free trial. Cancel anytime. Prices in USD.
        </p>
      </div>
    </main>
  );
}

function UpgradeButton({
  tier,
  label,
  session,
}: {
  tier: "pro" | "team";
  label: string;
  session: boolean;
}) {
  if (!session) {
    return (
      <Link
        href={`/register?next=/pricing`}
        className="block text-center py-3 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition"
      >
        Start free trial
      </Link>
    );
  }
  return (
    <form action={`/api/billing/checkout`} method="POST">
      <input type="hidden" name="tier" value={tier} />
      <button
        type="submit"
        className="w-full py-3 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition"
      >
        {label}
      </button>
    </form>
  );
}
