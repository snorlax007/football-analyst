import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const styles = StyleSheet.create({
  page:     { padding: 40, fontFamily: "Helvetica", backgroundColor: "#0f172a", color: "#f8fafc" },
  header:   { marginBottom: 24 },
  title:    { fontSize: 22, fontWeight: "bold", color: "#10b981", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#94a3b8" },
  section:  { marginBottom: 16 },
  label:    { fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  value:    { fontSize: 14, fontWeight: "bold", color: "#f1f5f9", marginBottom: 2 },
  row:      { flexDirection: "row", gap: 12, marginBottom: 12 },
  statBox:  { flex: 1, backgroundColor: "#1e293b", padding: 12, borderRadius: 6 },
  divider:  { borderBottom: "1px solid #1e293b", marginBottom: 16 },
  footer:   { position: "absolute", bottom: 30, left: 40, right: 40, borderTop: "1px solid #1e293b", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" },
  footerTxt: { fontSize: 8, color: "#475569" },
});

const s = (v: unknown) => String(v ?? "—");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { playerId } = await params;
  const pid = parseInt(playerId);
  if (isNaN(pid)) return NextResponse.json({ error: "Invalid player id" }, { status: 400 });

  const [playerRows, statsRows] = await Promise.all([
    sql`
      SELECT p.id, p.name, p.position, p.age, t.name AS team_name
      FROM players p JOIN teams t ON p.team_id = t.id
      WHERE p.id = ${pid}
    `,
    sql`
      SELECT
        COUNT(pr.id)::int AS matches,
        ROUND(AVG(pr.rating)::numeric, 2) AS avg_rating,
        SUM(pr.goals)::int AS goals,
        SUM(pr.assists)::int AS assists,
        ROUND(AVG(pr.pass_accuracy)::numeric, 1) AS pass_acc,
        SUM(pr.shots)::int AS shots,
        ROUND(AVG(pr.tackles)::numeric, 1) AS tackles,
        SUM(pr.minutes_played)::int AS minutes
      FROM player_ratings pr WHERE pr.player_id = ${pid}
    `,
  ]);

  if (playerRows.length === 0) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const p = playerRows[0];
  const st = statsRows[0] ?? {};
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{s(p.name)}</Text>
          <Text style={styles.subtitle}>
            {s(p.position)} · {s(p.team_name)}{p.age ? ` · Age ${s(p.age)}` : ""}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>Performance Summary</Text>
          <View style={styles.row}>
            <View style={styles.statBox}><Text style={styles.label}>Matches</Text><Text style={styles.value}>{s(st.matches)}</Text></View>
            <View style={styles.statBox}><Text style={styles.label}>Avg Rating</Text><Text style={styles.value}>{s(st.avg_rating)}</Text></View>
            <View style={styles.statBox}><Text style={styles.label}>Minutes</Text><Text style={styles.value}>{s(st.minutes)}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Attacking</Text>
          <View style={styles.row}>
            <View style={styles.statBox}><Text style={styles.label}>Goals</Text><Text style={styles.value}>{s(st.goals)}</Text></View>
            <View style={styles.statBox}><Text style={styles.label}>Assists</Text><Text style={styles.value}>{s(st.assists)}</Text></View>
            <View style={styles.statBox}><Text style={styles.label}>Shots</Text><Text style={styles.value}>{s(st.shots)}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Technical</Text>
          <View style={styles.row}>
            <View style={styles.statBox}><Text style={styles.label}>Pass Accuracy</Text><Text style={styles.value}>{s(st.pass_acc)}%</Text></View>
            <View style={styles.statBox}><Text style={styles.label}>Avg Tackles</Text><Text style={styles.value}>{s(st.tackles)}</Text></View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTxt}>Football AI Match Analyst</Text>
          <Text style={styles.footerTxt}>Scout Report — {today}</Text>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const name = s(p.name).replace(/\s+/g, "-").toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="scout-report-${name}.pdf"`,
    },
  });
}
