export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  check(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    // Cleanup old entries
    if (this.requests.size > 10000) {
      this.cleanup(windowStart);
    }
    
    return true;
  }
  
  private cleanup(cutoff: number) {
    for (const [key, times] of this.requests.entries()) {
      const recent = times.filter(t => t > cutoff);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
