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
        // Neon wraps fetch errors as NeonDbError { sourceError: TypeError { cause: AggregateError { code } } }
        // Also handle plain { cause: { code } } shape from older versions
        const e = err as { cause?: { code?: string }; sourceError?: { cause?: { code?: string } } };
        const code = e?.cause?.code ?? e?.sourceError?.cause?.code;
        if (code === "ETIMEDOUT" || code === "ECONNREFUSED") {
          // Neon cold-start can take 1–3s; retry with 1.5s delay then once more after 2s
          const retry = () => Reflect.apply(target, thisArg, args) as Promise<unknown>;
          return new Promise<void>((r) => setTimeout(r, 1500)).then(retry).catch(() =>
            new Promise<void>((r) => setTimeout(r, 2000)).then(retry)
          );
        }
        throw err;
      });
    }
    return result;
  },
}) as typeof _sql;

export default sql;
