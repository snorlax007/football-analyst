import { createHmac } from "crypto";
import sql from "@/lib/db";

export type WebhookEvent =
  | "match.analysis.completed"
  | "match.live.event"
  | "pre_match.report.generated";

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

let webhooksTableReady = false;
export async function ensureWebhooksTable() {
  if (webhooksTableReady) return;
  webhooksTableReady = true;
  await sql`
    CREATE TABLE IF NOT EXISTS webhooks (
      id         SERIAL PRIMARY KEY,
      org_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      url        TEXT NOT NULL,
      events     TEXT[] NOT NULL DEFAULT '{}',
      secret     TEXT NOT NULL,
      active     BOOLEAN NOT NULL DEFAULT TRUE,
      last_fired TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function deliverWebhook(orgId: string | number, event: WebhookEvent, data: Record<string, unknown>) {
  const hooks = await sql`
    SELECT id, url, secret FROM webhooks
    WHERE org_id = ${String(orgId)} AND active = TRUE AND ${event} = ANY(events)
  `;

  const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data };
  const body = JSON.stringify(payload);

  for (const hook of hooks) {
    const sig = createHmac("sha256", String(hook.secret)).update(body).digest("hex");
    try {
      await fetch(String(hook.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FA-Signature": `sha256=${sig}`,
          "X-FA-Event": event,
          "User-Agent": "FootballAI-Webhooks/1.0",
        },
        body,
        signal: AbortSignal.timeout(10000),
      });
      await sql`UPDATE webhooks SET last_fired = NOW() WHERE id = ${hook.id}`;
    } catch {
      // Fire-and-forget — don't block on delivery failures
    }
  }
}
