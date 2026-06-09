import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// Run once to create performance indexes. Safe to call multiple times (IF NOT EXISTS).
export async function POST() {
  const secret = process.env.ADMIN_SECRET;
  // In production, protect with a secret. In dev (no secret set), allow freely.
  if (secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use ADMIN_SECRET header" }, { status: 401 });
  }

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_matches_date ON matches (match_date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_matches_status ON matches (status)`,
    `CREATE INDEX IF NOT EXISTS idx_player_ratings_player_id ON player_ratings (player_id)`,
    `CREATE INDEX IF NOT EXISTS idx_player_ratings_match_id ON player_ratings (match_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_analyses_match_id ON ai_analyses (match_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses (created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_match_stats_match_id ON match_stats (match_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_usage_user_month ON user_usage (user_id, month)`,
    `CREATE INDEX IF NOT EXISTS idx_followed_teams_user_id ON followed_teams (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members (user_id)`,
  ];

  const results: string[] = [];
  for (const idx of indexes) {
    try {
      await sql.unsafe(idx);
      const name = idx.match(/idx_\w+/)?.[0] ?? "unknown";
      results.push(`✓ ${name}`);
    } catch (e) {
      results.push(`✗ ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ ok: true, indexes: results });
}
