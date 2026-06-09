import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

export default stripe;

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    analysesPerMonth: 5,
    teamsMax: 3,
    orgMembersMax: 1,
    features: [
      "5 AI analyses per month",
      "Up to 3 followed teams",
      "Basic match insights",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceId: process.env.STRIPE_PRICE_PRO,
    analysesPerMonth: 100,
    teamsMax: 999,
    orgMembersMax: 1,
    features: [
      "100 AI analyses per month",
      "Unlimited team following",
      "Deep tactical insights",
      "PDF export",
      "Priority support",
    ],
  },
  team: {
    name: "Team",
    price: 99,
    priceId: process.env.STRIPE_PRICE_TEAM,
    analysesPerMonth: 500,
    teamsMax: 999,
    orgMembersMax: 20,
    features: [
      "500 AI analyses per month (shared)",
      "Unlimited team following",
      "Full org dashboard",
      "Up to 20 org members",
      "Opposition scouting reports",
      "Season trend benchmarking",
      "Priority support",
    ],
  },
} as const;

export type PlanTier = keyof typeof PLANS;

export function getPlanLimits(tier: PlanTier) {
  return PLANS[tier];
}
