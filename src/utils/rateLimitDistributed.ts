import { Client, Databases, Query, ID } from 'node-appwrite';
import { logger } from './logger';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DB_ID = 'sipdades_db';
const COLLECTION_ID = 'rate_limit';

export async function rateLimitDistributed(
  ip: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // 1. Clean up expired entries in the background (limit to 50 docs per run to keep latency low)
    const oldEntries = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.lessThan('timestamp', windowStart),
      Query.limit(50)
    ]);
    for (const doc of oldEntries.documents) {
      await databases.deleteDocument(DB_ID, COLLECTION_ID, doc.$id).catch(() => {});
    }

    // 2. Count requests in the current window for this identifier
    const recent = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal('identifier', ip),
      Query.greaterThan('timestamp', windowStart),
      Query.limit(limit + 1)
    ]);

    if (recent.total >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: now + windowMs
      };
    }

    // 3. Record new request
    await databases.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
      identifier: ip,
      timestamp: now,
      ip: ip
    });

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - recent.total - 1),
      reset: now + windowMs
    };
  } catch (e: any) {
    logger.warn('RATE_LIMIT_DISTRIBUTED', 'Rate limit database check failed, failing open', { message: e.message });
    // Fail open: return successful limit check so users are not blocked by rate limiter failures
    return {
      success: true,
      limit,
      remaining: -1,
      reset: now + windowMs
    };
  }
}
