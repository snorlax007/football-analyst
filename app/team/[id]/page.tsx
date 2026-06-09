import type { Metadata } from "next";
import sql from "@/lib/db";
import TeamClient from "./TeamClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const teamId = parseInt(id);
  if (isNaN(teamId)) return { title: "Team" };

  const rows = await sql`SELECT name, short_name FROM teams WHERE id = ${teamId}`.catch(() => []);
  if (rows.length === 0) return { title: "Team" };

  const team = rows[0];
  const title = `${team.name} — Stats, Fixtures & AI Analysis`;
  const description = `View ${team.name} (${team.short_name}) season statistics, recent fixtures, and AI-powered tactical analysis on Football AI Analyst.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = parseInt(id);

  let jsonLd = null;
  if (!isNaN(teamId)) {
    const rows = await sql`SELECT name, short_name, country FROM teams WHERE id = ${teamId}`.catch(() => []);
    if (rows.length > 0) {
      const t = rows[0];
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "SportsTeam",
        name: t.name,
        alternateName: t.short_name,
        sport: "Soccer",
        location: t.country ? { "@type": "Country", name: t.country } : undefined,
        url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://football-analyst.vercel.app"}/team/${teamId}`,
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
      <TeamClient params={params} />
    </>
  );
}
