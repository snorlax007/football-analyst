import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import stripe, { PLANS } from "@/lib/stripe";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?next=/pricing", req.url));
  }

  let tier: "pro" | "team";
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    tier = body.tier;
  } else {
    const form = await req.formData();
    tier = form.get("tier") as "pro" | "team";
  }

  if (tier !== "pro" && tier !== "team") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const plan = PLANS[tier];
  if (!plan.priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured. Set STRIPE_PRICE_PRO / STRIPE_PRICE_TEAM env vars." },
      { status: 503 }
    );
  }

  const users = await sql`SELECT stripe_customer_id FROM users WHERE id = ${session.userId}`;
  const existing = users[0]?.stripe_customer_id as string | null;

  let customerId = existing;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.email,
      name: session.name,
      metadata: { userId: session.userId },
    });
    customerId = customer.id;
    await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${session.userId}`;
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    subscription_data: {
      trial_period_days: 7,
      metadata: { userId: session.userId, tier },
    },
    metadata: { userId: session.userId, tier },
  });

  return NextResponse.redirect(checkoutSession.url!, { status: 303 });
}
