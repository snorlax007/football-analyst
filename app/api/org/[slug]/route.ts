import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";
import { getOrgBySlug, getUserRoleInOrg, getOrgMembers, getPendingInvitations } from "@/lib/orgs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const role = await getUserRoleInOrg(session.userId, org.id);
  if (!role) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const month = new Date().toISOString().slice(0, 7);
  const [members, invitations, usageRows, recentActivity] = await Promise.all([
    getOrgMembers(org.id),
    getPendingInvitations(org.id),
    sql`SELECT reports_generated FROM org_usage WHERE org_id = ${org.id} AND month = ${month}`,
    sql`
      SELECT a.created_at, a.model,
             m.id AS match_id, m.home_score, m.away_score, m.league,
             ht.name AS home_name, at.name AS away_name
      FROM ai_analyses a
      JOIN matches m ON a.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `,
  ]);

  const usage = usageRows.length > 0 ? Number(usageRows[0].reports_generated) : 0;

  return NextResponse.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    myRole: role,
    members,
    invitations: role === "owner" ? invitations : [],
    usage: { used: usage, limit: 20, remaining: Math.max(0, 20 - usage) },
    recentActivity,
  });
}
