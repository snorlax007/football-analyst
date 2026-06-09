/**
 * Input sanitization helpers. Applied at API boundaries — not deep in business logic.
 */

/** Strip HTML tags and normalise whitespace. */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")       // remove HTML tags
    .replace(/&[a-z]+;/gi, " ")    // strip HTML entities
    .trim()
    .slice(0, 1000);                // hard cap to prevent huge inputs
}

/** Sanitise a free-text search query: keep alphanumeric + common punctuation only. */
export function sanitizeSearch(input: string): string {
  return stripHtml(input)
    .replace(/[^\w\s\-'.,]/g, "")  // strip shell/SQL special chars
    .slice(0, 200);
}

/** Sanitise an org/team name: printable characters, capped at 80 chars. */
export function sanitizeName(input: string): string {
  return stripHtml(input)
    .replace(/[^\w\s\-'.,!&()]/g, "")
    .slice(0, 80);
}

/** Sanitise a URL: only allow http/https. */
export function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.href;
  } catch {
    return "";
  }
}

/** Assert a value is a safe integer within range. */
export function safeInt(input: unknown, min: number, max: number): number | null {
  const n = Number(input);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}
