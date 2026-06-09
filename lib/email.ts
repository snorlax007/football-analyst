import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "noreply@football-analyst.app";

export interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  league: string;
  matchId: number;
  insights?: string[];
}

export async function sendPostMatchEmail(
  to: string,
  name: string,
  result: MatchResult
): Promise<void> {
  if (!resend) return;

  const insightHtml = result.insights?.length
    ? `<h3 style="color:#10b981">AI Tactical Analysis</h3><ul>${result.insights
        .map((i) => `<li style="margin-bottom:8px">${i}</li>`)
        .join("")}</ul>`
    : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Match Report: ${result.homeTeam} ${result.homeScore}–${result.awayScore} ${result.awayTeam}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#0f172a;color:#fff;padding:32px;max-width:600px;margin:0 auto">
  <div style="text-align:center;margin-bottom:32px">
    <span style="color:#10b981;font-size:24px">⚽</span>
    <h1 style="color:#10b981;font-size:18px;margin:8px 0">Football AI Analyst</h1>
    <p style="color:#64748b;font-size:13px">${result.league} · Match Report</p>
  </div>
  <div style="background:#1e293b;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
    <p style="color:#94a3b8;font-size:12px;margin:0 0 12px">FULL TIME</p>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:20px;font-weight:700">${result.homeTeam}</span>
      <span style="font-size:48px;font-weight:900;color:#10b981">${result.homeScore} – ${result.awayScore}</span>
      <span style="font-size:20px;font-weight:700">${result.awayTeam}</span>
    </div>
  </div>
  ${insightHtml}
  <div style="text-align:center;margin-top:32px">
    <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "https://football-analyst.vercel.app"}/matches/${result.matchId}"
       style="background:#10b981;color:#000;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700">
      Full Analysis →
    </a>
  </div>
  <p style="color:#475569;font-size:12px;text-align:center;margin-top:32px">
    Hi ${name}, you followed one of these teams. <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "https://football-analyst.vercel.app"}/dashboard" style="color:#10b981">Manage alerts</a>
  </p>
</body>
</html>`,
  });
}

export interface WeeklyDigestEntry {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  league: string;
  matchId: number;
  matchDate: string;
}

export async function sendWeeklyDigest(
  to: string,
  name: string,
  results: WeeklyDigestEntry[]
): Promise<void> {
  if (!resend || results.length === 0) return;

  const rows = results
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px 12px">${r.homeTeam}</td>
          <td style="padding:8px 12px;color:#10b981;font-weight:700;text-align:center">${r.homeScore}–${r.awayScore}</td>
          <td style="padding:8px 12px">${r.awayTeam}</td>
          <td style="padding:8px 12px;color:#64748b">${r.league}</td>
          <td style="padding:8px 12px">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "https://football-analyst.vercel.app"}/matches/${r.matchId}" style="color:#10b981">View →</a>
          </td>
        </tr>`
    )
    .join("");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your weekly football digest — ${results.length} match${results.length !== 1 ? "es" : ""}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#0f172a;color:#fff;padding:32px;max-width:600px;margin:0 auto">
  <h1 style="color:#10b981">⚽ Weekly Digest</h1>
  <p style="color:#94a3b8">Hi ${name}, here are last week's results for your followed teams.</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <thead>
      <tr style="color:#64748b;font-size:12px;text-transform:uppercase">
        <th style="padding:8px 12px;text-align:left">Home</th>
        <th style="padding:8px 12px">Score</th>
        <th style="padding:8px 12px;text-align:left">Away</th>
        <th style="padding:8px 12px;text-align:left">League</th>
        <th style="padding:8px 12px"></th>
      </tr>
    </thead>
    <tbody style="background:#1e293b;border-radius:8px">
      ${rows}
    </tbody>
  </table>
  <div style="text-align:center;margin-top:32px">
    <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "https://football-analyst.vercel.app"}/dashboard"
       style="background:#10b981;color:#000;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700">
      Open Dashboard →
    </a>
  </div>
  <p style="color:#475569;font-size:12px;text-align:center;margin-top:32px">
    <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "https://football-analyst.vercel.app"}/dashboard" style="color:#10b981">Manage email preferences</a>
  </p>
</body>
</html>`,
  });
}
