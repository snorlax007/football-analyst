import { neon, neonConfig } from "@neondatabase/serverless";

// Next.js patches global fetch with caching; opt out for DB requests
neonConfig.fetchFunction = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, cache: "no-store" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const _sql = neon(process.env.DATABASE_URL);

// Wrap with one auto-retry to handle Neon auto-suspend cold-start timeouts
const sql = new Proxy(_sql, {
  apply(target, thisArg, args) {
    const result = Reflect.apply(target, thisArg, args);
    if (result && typeof result.then === "function") {
      return result.catch((err: unknown) => {
        const code = (err as { cause?: { code?: string } })?.cause?.code;
        if (code === "ETIMEDOUT" || code === "ECONNREFUSED") {
          return new Promise((resolve) => setTimeout(resolve, 500)).then(() =>
            Reflect.apply(target, thisArg, args)
          );
        }
        throw err;
      });
    }
    return result;
  },
}) as typeof _sql;

export default sql;
