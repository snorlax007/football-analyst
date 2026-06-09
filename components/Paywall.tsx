import Link from "next/link";
import { PLANS, type PlanTier } from "@/lib/stripe";

interface PaywallProps {
  currentTier: PlanTier;
  requiredTier: "pro" | "team";
  feature?: string;
}

export default function Paywall({ currentTier, requiredTier, feature }: PaywallProps) {
  const plan = PLANS[requiredTier];
  const _ = currentTier; // used by caller for display context

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-8 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <h3 className="text-lg font-semibold text-yellow-300 mb-2">
        {feature ? `${feature} requires ${plan.name}` : `Upgrade to ${plan.name}`}
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        This feature is available on the <strong className="text-white">{plan.name}</strong> plan
        (${plan.price}/month).
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/pricing"
          className="px-6 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-400 transition"
        >
          View pricing
        </Link>
        <Link
          href="/pricing"
          className="px-6 py-2.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:border-gray-400 transition"
        >
          Compare plans
        </Link>
      </div>
    </div>
  );
}
