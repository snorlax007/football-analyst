import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const teams = await sql`
    SELECT t.id, t.name, t.short_name, t.logo_url
    FROM followed_teams ft
    JOIN teams t ON ft.team_id = t.id
    WHERE ft.user_id = ${session.userId}
    ORDER BY ft.created_at ASC
  `;

  return NextResponse.json({ teams });
}
