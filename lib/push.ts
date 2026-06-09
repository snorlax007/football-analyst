import webpush from "web-push";
import sql from "@/lib/db";

// Lazy VAPID init — avoid throwing at build time with missing/invalid keys
let _vapidReady = false;

function ensureVapid(): boolean {
  if (_vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:admin@football-analyst.app",
      pub,
      priv
    );
    _vapidReady = true;
    return true;
  } catch {
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureVapid()) return;

  const subs = await sql`
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}
  `;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        // 410 Gone — subscription expired, remove it
        if ((err as { statusCode?: number }).statusCode === 410) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint as string}`;
        }
      }
    })
  );
}

export async function sendPushToTeamFollowers(teamId: number, payload: PushPayload): Promise<void> {
  if (!ensureVapid()) return;

  const followers = await sql`
    SELECT DISTINCT ft.user_id
    FROM followed_teams ft
    WHERE ft.team_id = ${teamId}
  `;

  await Promise.allSettled(followers.map((f) => sendPushToUser(f.user_id as string, payload)));
}
