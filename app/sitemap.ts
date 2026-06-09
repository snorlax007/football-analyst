import type { MetadataRoute } from "next";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://football-analyst.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [matches, teams] = await Promise.all([
    sql`SELECT id, updated_at FROM matches ORDER BY match_date DESC LIMIT 200`,
    sql`SELECT id FROM teams ORDER BY name ASC`,
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, priority: 1.0, changeFrequency: "daily" },
    { url: `${BASE}/matches`, priority: 0.9, changeFrequency: "hourly" },
    { url: `${BASE}/pricing`, priority: 0.8, changeFrequency: "monthly" },
  ];

  const matchRoutes: MetadataRoute.Sitemap = matches.map((m) => ({
    url: `${BASE}/matches/${m.id}`,
    lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
    priority: 0.7,
    changeFrequency: "weekly" as const,
  }));

  const shareRoutes: MetadataRoute.Sitemap = matches.map((m) => ({
    url: `${BASE}/share/${m.id}`,
    lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
    priority: 0.6,
    changeFrequency: "weekly" as const,
  }));

  const teamRoutes: MetadataRoute.Sitemap = teams.map((t) => ({
    url: `${BASE}/team/${t.id}`,
    priority: 0.6,
    changeFrequency: "weekly" as const,
  }));

  return [...staticRoutes, ...matchRoutes, ...shareRoutes, ...teamRoutes];
}
