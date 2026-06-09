import type { Metadata } from "next";
import sql from "@/lib/db";
import MatchClient from "./MatchClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const matchId = parseInt(id);
  if (isNaN(matchId)) return { title: "Match" };

  const rows = await sql`
    SELECT m.home_score, m.away_score, m.league, m.match_date,
           ht.name AS home_name, at.name AS away_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.id = ${matchId}
  `.catch(() => []);

  if (rows.length === 0) return { title: "Match" };

  const m = rows[0];
  const title = `${m.home_name} ${m.home_score}–${m.away_score} ${m.away_name}`;
  const description = `AI tactical analysis of ${m.home_name} vs ${m.away_name}. ${m.league ?? "Premier League"} match stats, player ratings, and deep insights.`;
  const ogImage = `/api/og/match/${matchId}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Football AI Analyst`,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = parseInt(id);

  let jsonLd = null;
  if (!isNaN(matchId)) {
    const rows = await sql`
      SELECT m.home_score, m.away_score, m.league, m.match_date, m.status,
             ht.name AS home_name, at.name AS away_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ${matchId}
    `.catch(() => []);

    if (rows.length > 0) {
      const m = rows[0];
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: `${m.home_name} vs ${m.away_name}`,
        sport: "Soccer",
        homeTeam: { "@type": "SportsTeam", name: m.home_name },
        awayTeam: { "@type": "SportsTeam", name: m.away_name },
        startDate: m.match_date,
        eventStatus: m.status === "finished" ? "https://schema.org/EventScheduled" : undefined,
        description: `${m.home_name} ${m.home_score}–${m.away_score} ${m.away_name}. ${m.league ?? "Premier League"} match with AI tactical analysis.`,
      };
    }
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <MatchClient params={params} />
    </>
  );
}
