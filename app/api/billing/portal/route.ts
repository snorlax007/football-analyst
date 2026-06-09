import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import stripe from "@/lib/stripe";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const users = await sql`SELECT stripe_customer_id FROM users WHERE id = ${session.userId}`;
  const customerId = users[0]?.stripe_customer_id as string | null;

  if (!customerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: portalSession.url });
}
