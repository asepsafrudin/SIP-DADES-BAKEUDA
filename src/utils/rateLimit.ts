import { rateLimitDistributed } from './rateLimitDistributed';

export async function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  return await rateLimitDistributed(ip, limit, windowMs);
}
