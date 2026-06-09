import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const styles = StyleSheet.create({
  page:       { padding: 48, fontFamily: "Helvetica", backgroundColor: "#0f172a", color: "#f8fafc" },
  header:     { marginBottom: 20, borderBottom: "2px solid #10b981", paddingBottom: 14 },
  badge:      { fontSize: 8, color: "#10b981", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 },
  title:      { fontSize: 20, fontWeight: "bold", color: "#f8fafc", marginBottom: 3 },
  subtitle:   { fontSize: 10, color: "#64748b" },
  h2:         { fontSize: 13, fontWeight: "bold", color: "#10b981", marginBottom: 6, marginTop: 14 },
  body:       { fontSize: 10, color: "#cbd5e1", lineHeight: 1.6 },
  bold:       { fontSize: 10, fontWeight: "bold", color: "#f1f5f9" },
  footer:     { position: "absolute", bottom: 30, left: 48, right: 48, borderTop: "1px solid #1e293b", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerTxt:  { fontSize: 8, color: "#475569" },
});

function renderMarkdownToPdf(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("**")) {
      const text = line.replace(/^#+\s*/, "").replace(/\*\*/g, "");
      elements.push(<Text key={key++} style={styles.h2}>{text}</Text>);
    } else if (line.trim() === "") {
      elements.push(<Text key={key++} style={{ fontSize: 4 }}>{" "}</Text>);
    } else {
      const text = line.replace(/\*\*/g, "").replace(/^[-•]\s*/, "• ");
      elements.push(<Text key={key++} style={styles.body}>{text}</Text>);
    }
  }
  return elements;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { reportId } = await params;
  const rid = parseInt(reportId);
  if (isNaN(rid)) return NextResponse.json({ error: "Invalid report id" }, { status: 400 });

  const rows = await sql`
    SELECT * FROM pre_match_reports WHERE id = ${rid} AND user_id = ${session.userId}
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const r = rows[0];
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.badge}>Pre-Match Tactical Brief · Football AI Analyst</Text>
          <Text style={styles.title}>{String(r.home_team_name)} vs {String(r.away_team_name)}</Text>
          <Text style={styles.subtitle}>
            {r.match_date ? `Match date: ${String(r.match_date)} · ` : ""}Generated {today}
          </Text>
        </View>

        <View>{renderMarkdownToPdf(String(r.report_md))}</View>

        <View style={styles.footer}>
          <Text style={styles.footerTxt}>Football AI Match Analyst</Text>
          <Text style={styles.footerTxt}>CONFIDENTIAL — For coaching staff only</Text>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const slug = `${String(r.home_team_name)}-vs-${String(r.away_team_name)}`.replace(/\s+/g, "-").toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pre-match-${slug}.pdf"`,
    },
  });
}
