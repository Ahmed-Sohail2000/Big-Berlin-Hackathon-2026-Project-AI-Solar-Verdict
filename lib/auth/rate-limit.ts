// lib/auth/rate-limit.ts
// Slows password guessing. Counts failed logins per client and refuses that client
// for the rest of the window once it passes the limit. State lives in one server
// process, so it resets on restart. The host's own protection stays the outer layer.

export const MAX_FAILURES = 10;
export const WINDOW_MS = 15 * 60 * 1000;
/** Bounds memory if someone rotates through addresses. */
const MAX_TRACKED_CLIENTS = 10_000;

interface Failures {
  count: number;
  resetAt: number;
}

export class LoginThrottle {
  private failures = new Map<string, Failures>();

  /** Seconds the client must wait, or null when it may try. */
  retryAfter(client: string, now: number): number | null {
    const entry = this.failures.get(client);
    if (!entry || now >= entry.resetAt) return null;
    return entry.count >= MAX_FAILURES ? Math.ceil((entry.resetAt - now) / 1000) : null;
  }

  recordFailure(client: string, now: number) {
    const entry = this.failures.get(client);
    if (entry && now < entry.resetAt) {
      entry.count++;
      return;
    }
    if (this.failures.size >= MAX_TRACKED_CLIENTS) this.evict(now);
    this.failures.set(client, { count: 1, resetAt: now + WINDOW_MS });
  }

  recordSuccess(client: string) {
    this.failures.delete(client);
  }

  private evict(now: number) {
    for (const [client, entry] of this.failures) {
      if (now >= entry.resetAt) this.failures.delete(client);
    }
    if (this.failures.size >= MAX_TRACKED_CLIENTS) this.failures.clear();
  }
}
