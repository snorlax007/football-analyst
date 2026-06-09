import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", backgroundColor: "#ffffff", color: "#0f172a" },
  header: { marginBottom: 24, borderBottomWidth: 2, borderBottomColor: "#10b981", paddingBottom: 16 },
  brand: { fontSize: 9, color: "#10b981", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 },
  league: { fontSize: 9, color: "#64748b", marginBottom: 12 },
  score: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamName: { fontSize: 18, fontFamily: "Helvetica-Bold", flex: 1 },
  scoreNum: { fontSize: 36, fontFamily: "Helvetica-Bold", color: "#10b981", textAlign: "center", paddingHorizontal: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#10b981", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 6, paddingHorizontal: 8 },
  tableRowLast: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8 },
  tableLabel: { flex: 2, fontSize: 9, color: "#475569" },
  tableValue: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0f172a", textAlign: "right" },
  insightBox: { flexDirection: "row", backgroundColor: "#f0fdf4", borderLeftWidth: 3, borderLeftColor: "#10b981", marginBottom: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 2 },
  insightBullet: { fontSize: 10, color: "#10b981", marginRight: 6 },
  insightText: { fontSize: 9, color: "#1e293b", lineHeight: 1.4, flex: 1 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#94a3b8" },
});

function MatchReport({ data }: { data: ReportData }) {
  const { match, homeStats, awayStats, players, insights } = data;
  const s = (v: unknown) => String(v ?? "");
  const date = match.match_date ? new Date(String(match.match_date)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Football AI Analyst · Match Report</Text>
          <Text style={styles.league}>{s(match.league) || "Premier League"}{date ? ` · ${date}` : ""}</Text>
          <View style={styles.score}>
            <Text style={styles.teamName}>{s(match.home_name)}</Text>
            <Text style={styles.scoreNum}>{s(match.home_score)} – {s(match.away_score)}</Text>
            <Text style={[styles.teamName, { textAlign: "right" }]}>{s(match.away_name)}</Text>
          </View>
        </View>

        {/* Team Stats */}
        {homeStats && awayStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Statistics</Text>
            <View style={styles.table}>
              {([
                ["", s(match.home_name), s(match.away_name)],
                ["Possession", `${s(homeStats.possession)}%`, `${s(awayStats.possession)}%`],
                ["Expected Goals (xG)", s(homeStats.xg), s(awayStats.xg)],
                ["Shots / On Target", `${s(homeStats.shots)} / ${s(homeStats.shots_on_target)}`, `${s(awayStats.shots)} / ${s(awayStats.shots_on_target)}`],
                ["Pass Accuracy", `${s(homeStats.pass_accuracy)}%`, `${s(awayStats.pass_accuracy)}%`],
                ["Pressing Intensity", `${s(homeStats.press_intensity)}%`, `${s(awayStats.press_intensity)}%`],
                ["Corners", s(homeStats.corners), s(awayStats.corners)],
                ["Fouls", s(homeStats.fouls), s(awayStats.fouls)],
              ] as [string, string, string][]).map(([label, home, away], i) => (
                <View key={i} style={i === 7 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.tableLabel, i === 0 ? { fontFamily: "Helvetica-Bold" } : {}]}>{label}</Text>
                  <Text style={[styles.tableValue, i === 0 ? { color: "#10b981" } : {}]}>{home}</Text>
                  <Text style={[styles.tableValue, i === 0 ? { color: "#64748b" } : {}]}>{away}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Player Ratings */}
        {players.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Player Ratings</Text>
            <View style={styles.table}>
              {players.slice(0, 6).map((p, i) => (
                <View key={String(p.id)} style={i === Math.min(players.length, 6) - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={styles.tableLabel}>{s(p.name)} · {s(p.position)} · {s(p.team_name)}</Text>
                  <Text style={styles.tableValue}>{Number(p.rating).toFixed(1)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Tactical Analysis</Text>
            {insights.map((text, i) => (
              <View key={i} style={styles.insightBox}>
                <Text style={styles.insightBullet}>›</Text>
                <Text style={styles.insightText}>{text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Football AI Analyst</Text>
          <Text style={styles.footerText}>Generated {new Date().toLocaleDateString()}</Text>
        </View>
      </Page>
    </Document>
  );
}

interface ReportData {
  match: Record<string, unknown>;
  homeStats: Record<string, unknown> | null;
  awayStats: Record<string, unknown> | null;
  players: Record<string, unknown>[];
  insights: string[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  // Check auth — PDF export is Pro+ only
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const userRows = await sql`SELECT subscription_tier FROM users WHERE id = ${session.userId}`;
  const tier = userRows[0]?.subscription_tier as string ?? "free";
  if (tier === "free") {
    return NextResponse.json({ error: "PDF export requires Pro or Team plan. Upgrade at /pricing." }, { status: 403 });
  }

  const { matchId } = await params;
  const id = parseInt(matchId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });

  const [matches, stats, players, analyses] = await Promise.all([
    sql`
      SELECT m.*, ht.name AS home_name, at.name AS away_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${id}
    `,
    sql`
      SELECT ms.*, t.name AS team_name
      FROM match_stats ms JOIN teams t ON ms.team_id = t.id
      WHERE ms.match_id = ${id}
    `,
    sql`
      SELECT pr.*, p.name, p.position, t.name AS team_name
      FROM player_ratings pr
      JOIN players p ON pr.player_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE pr.match_id = ${id}
      ORDER BY pr.rating DESC LIMIT 6
    `,
    sql`SELECT insights FROM ai_analyses WHERE match_id = ${id} ORDER BY created_at DESC LIMIT 1`,
  ]);

  if (matches.length === 0) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const match = matches[0];
  const homeStats = stats.find((s) => s.team_id === match.home_team_id) ?? null;
  const awayStats = stats.find((s) => s.team_id === match.away_team_id) ?? null;
  const insights: string[] = analyses.length > 0
    ? (Array.isArray(analyses[0].insights) ? analyses[0].insights : JSON.parse(analyses[0].insights as string))
    : [];

  const reportData: ReportData = { match, homeStats, awayStats, players, insights };

  const buffer = await renderToBuffer(<MatchReport data={reportData} />);
  const slug = `${String(match.home_name).toLowerCase().replace(/\s+/g, "-")}-vs-${String(match.away_name).toLowerCase().replace(/\s+/g, "-")}`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="match-report-${slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
