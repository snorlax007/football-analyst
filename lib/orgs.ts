import sql from "@/lib/db";

export type OrgRole = "owner" | "analyst" | "viewer";

export interface OrgMember {
  user_id: string;
  name: string;
  email: string;
  role: OrgRole;
  joined_at: string;
}

export interface OrgInvitation {
  id: string;
  email: string;
  role: OrgRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const rows = await sql`SELECT id FROM organizations WHERE slug = ${slug}`;
    if (rows.length === 0) return slug;
    slug = `${base}-${++attempt}`;
  }
}

export async function getUserOrgs(userId: string) {
  return sql`
    SELECT o.id, o.name, o.slug, om.role
    FROM organizations o
    JOIN org_members om ON o.id = om.org_id
    WHERE om.user_id = ${userId}
    ORDER BY o.created_at ASC
  `;
}

export async function getOrgBySlug(slug: string) {
  const rows = await sql`SELECT * FROM organizations WHERE slug = ${slug}`;
  return rows[0] ?? null;
}

export async function getUserRoleInOrg(userId: string, orgId: string): Promise<OrgRole | null> {
  const rows = await sql`
    SELECT role FROM org_members WHERE user_id = ${userId} AND org_id = ${orgId}
  `;
  return rows.length > 0 ? (rows[0].role as OrgRole) : null;
}

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const rows = await sql`
    SELECT om.user_id, u.name, u.email, om.role, om.joined_at
    FROM org_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.org_id = ${orgId}
    ORDER BY om.joined_at ASC
  `;
  return rows as unknown as OrgMember[];
}

export async function getPendingInvitations(orgId: string): Promise<OrgInvitation[]> {
  const rows = await sql`
    SELECT id, email, role, token, expires_at, accepted_at
    FROM org_invitations
    WHERE org_id = ${orgId} AND accepted_at IS NULL AND expires_at > NOW()
    ORDER BY created_at DESC
  `;
  return rows as unknown as OrgInvitation[];
}
