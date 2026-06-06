import { neon, neonConfig } from "@neondatabase/serverless";

// Next.js patches global fetch with caching; opt out for DB requests
neonConfig.fetchFunction = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, cache: "no-store" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(process.env.DATABASE_URL);
export default sql;
