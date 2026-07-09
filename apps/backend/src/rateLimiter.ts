/**
 * Simple token-bucket rate limiter per socket per action.
 * Prevents a single client from flooding the server with events.
 */
export class SocketRateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private maxTokens: number;
  private refillRateMs: number;

  constructor(maxTokens: number = 5, refillRateMs: number = 1000) {
    this.maxTokens = maxTokens;
    this.refillRateMs = refillRateMs;
  }

  allow(socketId: string, action: string): boolean {
    const key = `${socketId}:${action}`;
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillRateMs) * this.maxTokens;
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  cleanup(socketId: string): void {
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`${socketId}:`)) {
        this.buckets.delete(key);
      }
    }
  }
}

// Location updates: allow 5 per second (GPS typically sends 1/s)
export const locationRateLimiter = new SocketRateLimiter(5, 1000);

// Status updates: allow 2 per 5 seconds (button clicks)
export const statusRateLimiter = new SocketRateLimiter(2, 5000);
