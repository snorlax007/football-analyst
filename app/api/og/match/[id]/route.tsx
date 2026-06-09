import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import sql from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseInt(id);
  if (isNaN(matchId)) return new Response("Invalid ID", { status: 400 });

  const [matches, analyses] = await Promise.all([
    sql`
      SELECT m.home_score, m.away_score, m.league, m.status,
             ht.name AS home_name, at.name AS away_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${matchId}
    `,
    sql`SELECT insights FROM ai_analyses WHERE match_id = ${matchId} ORDER BY created_at DESC LIMIT 1`,
  ]);

  if (matches.length === 0) return new Response("Not found", { status: 404 });

  const match = matches[0];
  const insights: string[] = analyses.length > 0
    ? (Array.isArray(analyses[0].insights) ? analyses[0].insights : JSON.parse(analyses[0].insights as string))
    : [];
  const topInsight = insights[0] ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          padding: "56px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background accent */}
        <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, #10b98120 0%, transparent 70%)", display: "flex" }} />

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "40px" }}>
          <div style={{ width: 32, height: 32, background: "#10b981", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "18px" }}>⚽</div>
          <span style={{ color: "#10b981", fontSize: "14px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>
            Football AI Analyst
          </span>
          <span style={{ marginLeft: "auto", color: "#64748b", fontSize: "13px" }}>
            {match.league ?? "Premier League"}
          </span>
        </div>

        {/* Score */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Home</span>
            <span style={{ color: "#ffffff", fontSize: "42px", fontWeight: 800, lineHeight: 1 }}>{match.home_name}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 40px" }}>
            <span style={{ color: "#10b981", fontSize: "80px", fontWeight: 900, lineHeight: 1, letterSpacing: "-2px" }}>
              {match.home_score} – {match.away_score}
            </span>
            <span style={{ color: "#475569", fontSize: "12px", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase", marginTop: "8px" }}>
              {match.status === "finished" ? "Full Time" : match.status === "live" ? "Live" : "Upcoming"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "flex-end" }}>
            <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Away</span>
            <span style={{ color: "#ffffff", fontSize: "42px", fontWeight: 800, lineHeight: 1, textAlign: "right" }}>{match.away_name}</span>
          </div>
        </div>

        {/* AI Insight */}
        {topInsight && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "12px", padding: "16px 20px", marginTop: "32px" }}>
            <span style={{ color: "#10b981", fontSize: "22px", marginTop: "2px", flexShrink: 0 }}>›</span>
            <span style={{ color: "#cbd5e1", fontSize: "15px", lineHeight: "1.5", flex: 1 }}>
              {topInsight.length > 180 ? topInsight.slice(0, 177) + "…" : topInsight}
            </span>
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
