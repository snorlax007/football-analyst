import { NextRequest } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// Minimal widget page — designed to be embedded as an iframe
// Whitelabel: pass ?whitelabel=1 to hide branding (Pro/Team)

interface WidgetData {
  homeName: string;
  homeShort: string;
  homeScore: number;
  awayName: string;
  awayShort: string;
  awayScore: number;
  status: string;
  league: string;
  topInsight: string | null;
}

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ whitelabel?: string }>;
}) {
  const { id } = await params;
  const { whitelabel } = await searchParams;
  const mid = parseInt(id);
  const showBranding = whitelabel !== "1";

  let data: WidgetData | null = null;

  if (!isNaN(mid)) {
    const [matchRows, analysisRows] = await Promise.all([
      sql`
        SELECT m.id, m.home_score, m.away_score, m.status, m.league,
               ht.name AS home_name, ht.short_name AS home_short,
               at.name AS away_name, at.short_name AS away_short
        FROM matches m
        JOIN teams ht ON m.home_team_id = ht.id
        JOIN teams at ON m.away_team_id = at.id
        WHERE m.id = ${mid}
      `,
      sql`
        SELECT insights FROM ai_analyses WHERE match_id = ${mid}
        ORDER BY created_at DESC LIMIT 1
      `,
    ]);

    if (matchRows.length > 0) {
      const m = matchRows[0];
      data = {
        homeName: String(m.home_name),
        homeShort: String(m.home_short),
        homeScore: Number(m.home_score),
        awayName: String(m.away_name),
        awayShort: String(m.away_short),
        awayScore: Number(m.away_score),
        status: String(m.status),
        league: String(m.league ?? ""),
        topInsight: analysisRows.length > 0
          ? ((analysisRows[0].insights as string[])[0] ?? null)
          : null,
      };
    }
  }

  const statusLabel: Record<string, string> = { finished: "FT", live: "LIVE", scheduled: "vs" };

  if (!data) {
    return (
      <html>
        <body style={{ margin: 0, background: "#0f172a", color: "#fff", fontFamily: "system-ui", display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
          <p style={{ color: "#64748b", fontSize: 13 }}>Match not found</p>
        </body>
      </html>
    );
  }

  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; padding: 16px; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
          .card { display: flex; flex-direction: column; gap: 10px; }
          .scoreline { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
          .team { flex: 1; font-weight: 700; font-size: 14px; }
          .team.home { text-align: right; }
          .team.away { text-align: left; }
          .score-block { text-align: center; flex-shrink: 0; }
          .score { font-size: 28px; font-weight: 900; color: #10b981; letter-spacing: -1px; line-height: 1; }
          .status-badge { display: inline-block; font-size: 9px; background: #1e293b; color: #94a3b8; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; font-weight: 600; }
          .status-badge.live { background: rgba(239,68,68,0.2); color: #f87171; }
          .league { font-size: 10px; color: #475569; text-align: center; }
          .insight { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.2); border-radius: 8px; padding: 8px 10px; font-size: 11px; color: #94a3b8; line-height: 1.5; }
          .insight-label { color: #10b981; font-weight: 600; font-size: 10px; margin-bottom: 3px; }
          .branding { font-size: 9px; color: #334155; text-align: center; text-decoration: none; }
          .branding:hover { color: #64748b; }
          a { color: inherit; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <p className="league">{data.league}</p>
          <div className="scoreline">
            <div className="team home">{data.homeName}</div>
            <div className="score-block">
              <div className="score">{data.homeScore} – {data.awayScore}</div>
              <span className={`status-badge${data.status === "live" ? " live" : ""}`}>
                {statusLabel[data.status] ?? data.status}
              </span>
            </div>
            <div className="team away">{data.awayName}</div>
          </div>
          {data.topInsight && (
            <div className="insight">
              <p className="insight-label">⚡ AI Insight</p>
              <p>{data.topInsight.slice(0, 120)}{data.topInsight.length > 120 ? "…" : ""}</p>
            </div>
          )}
        </div>
        {showBranding && (
          <a href="/" className="branding" target="_blank" rel="noopener noreferrer">
            Powered by Football AI Analyst
          </a>
        )}
      </body>
    </html>
  );
}
