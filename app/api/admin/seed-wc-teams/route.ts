import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("x-admin-secret") === secret;
}

// All 48 FIFA World Cup 2026 qualified / likely-qualified nations
const WC2026_TEAMS = [
  // Hosts
  { name: "United States",    short_name: "USA", country: "USA",      confederation: "CONCACAF" },
  { name: "Canada",           short_name: "CAN", country: "Canada",   confederation: "CONCACAF" },
  { name: "Mexico",           short_name: "MEX", country: "Mexico",   confederation: "CONCACAF" },
  // CONMEBOL (6)
  { name: "Argentina",        short_name: "ARG", country: "Argentina",  confederation: "CONMEBOL" },
  { name: "Brazil",           short_name: "BRA", country: "Brazil",     confederation: "CONMEBOL" },
  { name: "Colombia",         short_name: "COL", country: "Colombia",   confederation: "CONMEBOL" },
  { name: "Uruguay",          short_name: "URU", country: "Uruguay",    confederation: "CONMEBOL" },
  { name: "Ecuador",          short_name: "ECU", country: "Ecuador",    confederation: "CONMEBOL" },
  { name: "Paraguay",         short_name: "PAR", country: "Paraguay",   confederation: "CONMEBOL" },
  // UEFA (16)
  { name: "England",          short_name: "ENG", country: "England",     confederation: "UEFA" },
  { name: "France",           short_name: "FRA", country: "France",      confederation: "UEFA" },
  { name: "Germany",          short_name: "GER", country: "Germany",     confederation: "UEFA" },
  { name: "Spain",            short_name: "ESP", country: "Spain",       confederation: "UEFA" },
  { name: "Portugal",         short_name: "POR", country: "Portugal",    confederation: "UEFA" },
  { name: "Netherlands",      short_name: "NED", country: "Netherlands", confederation: "UEFA" },
  { name: "Belgium",          short_name: "BEL", country: "Belgium",     confederation: "UEFA" },
  { name: "Croatia",          short_name: "CRO", country: "Croatia",     confederation: "UEFA" },
  { name: "Switzerland",      short_name: "SUI", country: "Switzerland", confederation: "UEFA" },
  { name: "Denmark",          short_name: "DEN", country: "Denmark",     confederation: "UEFA" },
  { name: "Austria",          short_name: "AUT", country: "Austria",     confederation: "UEFA" },
  { name: "Hungary",          short_name: "HUN", country: "Hungary",     confederation: "UEFA" },
  { name: "Scotland",         short_name: "SCO", country: "Scotland",    confederation: "UEFA" },
  { name: "Serbia",           short_name: "SRB", country: "Serbia",      confederation: "UEFA" },
  { name: "Romania",          short_name: "ROU", country: "Romania",     confederation: "UEFA" },
  { name: "Turkey",           short_name: "TUR", country: "Turkey",      confederation: "UEFA" },
  // CAF — Africa (9)
  { name: "Morocco",          short_name: "MAR", country: "Morocco",      confederation: "CAF" },
  { name: "Senegal",          short_name: "SEN", country: "Senegal",      confederation: "CAF" },
  { name: "Nigeria",          short_name: "NGA", country: "Nigeria",      confederation: "CAF" },
  { name: "Egypt",            short_name: "EGY", country: "Egypt",        confederation: "CAF" },
  { name: "Ivory Coast",      short_name: "CIV", country: "Ivory Coast",  confederation: "CAF" },
  { name: "Cameroon",         short_name: "CMR", country: "Cameroon",     confederation: "CAF" },
  { name: "Algeria",          short_name: "ALG", country: "Algeria",      confederation: "CAF" },
  { name: "Tunisia",          short_name: "TUN", country: "Tunisia",      confederation: "CAF" },
  { name: "Ghana",            short_name: "GHA", country: "Ghana",        confederation: "CAF" },
  // AFC — Asia (8)
  { name: "Japan",            short_name: "JPN", country: "Japan",        confederation: "AFC" },
  { name: "South Korea",      short_name: "KOR", country: "South Korea",  confederation: "AFC" },
  { name: "Iran",             short_name: "IRN", country: "Iran",         confederation: "AFC" },
  { name: "Saudi Arabia",     short_name: "KSA", country: "Saudi Arabia", confederation: "AFC" },
  { name: "Australia",        short_name: "AUS", country: "Australia",    confederation: "AFC" },
  { name: "Japan",            short_name: "JPN", country: "Japan",        confederation: "AFC" },
  { name: "Uzbekistan",       short_name: "UZB", country: "Uzbekistan",   confederation: "AFC" },
  { name: "Iraq",             short_name: "IRQ", country: "Iraq",         confederation: "AFC" },
  { name: "Qatar",            short_name: "QAT", country: "Qatar",        confederation: "AFC" },
  // CONCACAF non-host (3)
  { name: "Panama",           short_name: "PAN", country: "Panama",   confederation: "CONCACAF" },
  { name: "Jamaica",          short_name: "JAM", country: "Jamaica",  confederation: "CONCACAF" },
  { name: "Honduras",         short_name: "HON", country: "Honduras", confederation: "CONCACAF" },
  // OFC (1)
  { name: "New Zealand",      short_name: "NZL", country: "New Zealand", confederation: "OFC" },
  // Extra UEFA (playoff spots)
  { name: "Ukraine",          short_name: "UKR", country: "Ukraine",  confederation: "UEFA" },
  { name: "Greece",           short_name: "GRE", country: "Greece",   confederation: "UEFA" },
];

// De-dup by short_name
const UNIQUE_TEAMS = [
  ...new Map(WC2026_TEAMS.map((t) => [t.short_name, t])).values(),
];

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Add confederation column if missing
  await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS confederation TEXT`;
  await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS country TEXT`;

  const inserted: string[] = [];
  const skipped:  string[] = [];

  for (const team of UNIQUE_TEAMS) {
    try {
      const existing = await sql`SELECT id FROM teams WHERE short_name = ${team.short_name}`;
      if (existing.length > 0) {
        // Update confederation/country metadata
        await sql`
          UPDATE teams SET
            confederation = ${team.confederation},
            country       = ${team.country}
          WHERE short_name = ${team.short_name}
        `;
        skipped.push(team.short_name);
      } else {
        await sql`
          INSERT INTO teams (name, short_name, confederation, country)
          VALUES (${team.name}, ${team.short_name}, ${team.confederation}, ${team.country})
        `;
        inserted.push(team.short_name);
      }
    } catch (e) {
      skipped.push(`${team.short_name} (err: ${(e as Error).message.slice(0, 40)})`);
    }
  }

  return NextResponse.json({
    ok: true,
    inserted: inserted.length,
    skipped:  skipped.length,
    teams:    inserted,
  });
}
