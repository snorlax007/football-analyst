import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import sql from "@/lib/db";

// Stripe requires the raw body — disable body parsing
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(sub);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function subPeriodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  if (!item?.current_period_end) return null;
  return new Date(item.current_period_end * 1000).toISOString();
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as "pro" | "team" | undefined;
  if (!userId || !tier) return;

  if (session.subscription) {
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    const periodEnd = subPeriodEnd(sub);
    await sql`
      UPDATE users SET
        subscription_tier = ${tier},
        subscription_status = ${sub.status},
        stripe_subscription_id = ${sub.id},
        subscription_period_end = ${periodEnd}
      WHERE id = ${userId}
    `;
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const tier = sub.metadata?.tier as "pro" | "team" | undefined;
  const periodEnd = subPeriodEnd(sub);

  await sql`
    UPDATE users SET
      subscription_tier = ${tier ?? "free"},
      subscription_status = ${sub.status},
      subscription_period_end = ${periodEnd}
    WHERE stripe_subscription_id = ${sub.id}
  `;
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await sql`
    UPDATE users SET
      subscription_tier = 'free',
      subscription_status = 'canceled',
      stripe_subscription_id = NULL,
      subscription_period_end = NULL
    WHERE stripe_subscription_id = ${sub.id}
  `;
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subId = invoice.lines?.data?.[0]?.subscription ?? null;
  if (!subId) return;
  await sql`
    UPDATE users SET subscription_status = 'past_due'
    WHERE stripe_subscription_id = ${subId}
  `;
}
