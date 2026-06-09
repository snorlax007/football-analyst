import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const teams = await sql`SELECT id, name, short_name FROM teams ORDER BY name ASC`;
  return NextResponse.json({ teams });
}
