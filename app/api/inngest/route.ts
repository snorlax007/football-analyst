import { type NextRequest, NextResponse } from "next/server";

// Inngest requires INNGEST_SIGNING_KEY (prod) or INNGEST_DEV=1 (dev).
// Dynamically import only when configured to avoid startup errors.
async function getHandlers() {
  if (!process.env.INNGEST_SIGNING_KEY && process.env.INNGEST_DEV !== "1") {
    return null;
  }
  const { serve } = await import("inngest/next");
  const { inngest, generateAnalysis } = await import("@/lib/inngest");
  return serve({ client: inngest, functions: [generateAnalysis] });
}

const handlersPromise = getHandlers();

const notConfigured = () =>
  NextResponse.json(
    { ok: false, message: "Inngest not configured. Set INNGEST_DEV=1 (dev) or INNGEST_SIGNING_KEY (prod)." },
    { status: 200 }
  );

export async function GET(req: NextRequest) {
  const h = await handlersPromise;
  return h ? h.GET(req, undefined) : notConfigured();
}
export async function POST(req: NextRequest) {
  const h = await handlersPromise;
  return h ? h.POST(req, undefined) : notConfigured();
}
export async function PUT(req: NextRequest) {
  const h = await handlersPromise;
  return h ? h.PUT(req, undefined) : notConfigured();
}
