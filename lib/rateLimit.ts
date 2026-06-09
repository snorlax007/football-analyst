/**
 * Sliding-window in-memory rate limiter.
 * Works in a single-process (dev/single instance). For multi-instance production,
 * swap the store for Upstash Redis: @upstash/ratelimit with @upstash/redis.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Clean up expired entries every 5 minutes to avoid memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store.entries()) {
      if (win.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  windowMs: number; // window duration in ms
  max: number;      // max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const win = store.get(key);

  if (!win || win.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  if (win.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: win.resetAt };
  }

  win.count++;
  return { allowed: true, remaining: config.max - win.count, resetAt: win.resetAt };
}

// Pre-defined limits for common routes
export const LIMITS = {
  auth:    { windowMs: 15 * 60 * 1000, max: 10  }, // 10 attempts per 15 min
  api:     { windowMs:  1 * 60 * 1000, max: 60  }, // 60 req/min for public API
  aiGen:   { windowMs:  1 * 60 * 1000, max: 5   }, // 5 analysis triggers/min
  search:  { windowMs:  1 * 60 * 1000, max: 30  }, // 30 searches/min
};
