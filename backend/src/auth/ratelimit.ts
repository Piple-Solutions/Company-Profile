// In-memory token-bucket rate limiter (per-key). Local/dev + single-instance
// semantics; distributed deployments need a shared store (pre-prod concern).
export interface BucketOpts {
  capacity: number;
  refillPerSecond: number;
  /** Bound memory growth from arbitrary keys (default 10,000). */
  maxBuckets?: number;
}

export class RateLimiter {
  private buckets = new Map<string, { tokens: number; updated: number }>();
  private opts: BucketOpts;
  private maxBuckets: number;
  constructor(opts: BucketOpts) {
    this.opts = opts;
    this.maxBuckets = Math.max(1, opts.maxBuckets ?? 10_000);
  }

  private makeRoom(now: number): void {
    if (this.buckets.size < this.maxBuckets) return;
    const fullRefillMs = this.opts.refillPerSecond > 0
      ? (this.opts.capacity / this.opts.refillPerSecond) * 1000
      : Number.POSITIVE_INFINITY;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.updated >= fullRefillMs) this.buckets.delete(key);
    }
    while (this.buckets.size >= this.maxBuckets) {
      const oldest = this.buckets.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.buckets.delete(oldest);
    }
  }

  take(key: string, now = Date.now()): boolean {
    if (!this.buckets.has(key)) this.makeRoom(now);
    const b = this.buckets.get(key) ?? { tokens: this.opts.capacity, updated: now };
    const elapsed = Math.max(0, (now - b.updated) / 1000);
    b.tokens = Math.min(this.opts.capacity, b.tokens + elapsed * this.opts.refillPerSecond);
    b.updated = now;
    if (b.tokens < 1) {
      this.buckets.set(key, b);
      return false;
    }
    b.tokens -= 1;
    this.buckets.set(key, b);
    return true;
  }

  resetForTests(): void {
    this.buckets.clear();
  }
}
