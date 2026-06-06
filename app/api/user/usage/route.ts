import { NextResponse } from "next/server";
import { getSession, FREE_LIMIT } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const month = new Date().toISOString().slice(0, 7);
  const rows = await sql`
    SELECT reports_generated FROM user_usage
    WHERE user_id = ${session.userId} AND month = ${month}
  `;

  const used = rows.length > 0 ? Number(rows[0].reports_generated) : 0;
  return NextResponse.json({ used, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - used) });
}
