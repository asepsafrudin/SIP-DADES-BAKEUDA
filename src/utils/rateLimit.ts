/**
 * Simple In-Memory Rate Limiter
 * Note: In a multi-instance serverless environment, this limits per-instance.
 */

interface RateLimitData {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitData>();

export function rateLimit(ip: string, limit: number, windowMs: number): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const windowEnd = now + windowMs;
  
  let data = rateLimitMap.get(ip);
  
  if (!data || data.resetTime < now) {
    // New IP or window expired
    data = { count: 1, resetTime: windowEnd };
  } else {
    // Within window
    data.count++;
  }
  
  rateLimitMap.set(ip, data);
  
  const remaining = Math.max(0, limit - data.count);
  
  return {
    success: data.count <= limit,
    limit,
    remaining,
    reset: data.resetTime
  };
}

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (data.resetTime < now) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();
