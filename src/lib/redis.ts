import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);

export async function getOrInitProductStock(productId: string, capacity: number, currentSold: number): Promise<boolean> {
  const key = `product:${productId}:stock`;
  
  // Try to set the initial available stock (Capacity - Sold)
  // setnx only sets if key doesn't exist
  const available = Math.max(0, capacity - currentSold);
  await redis.setnx(key, available);
  
  // Return true to indicate client is ready
  return true;
}

export async function decrementProductStock(productId: string): Promise<boolean> {
  const key = `product:${productId}:stock`;
  
  // Atomic decrement
  const result = await redis.decr(key);
  
  // If result is < 0, we oversold or are empty. 
  // We should increment it back to 0 (or keep it negative to indicate depth of waitlist?)
  // Typically for a simple gatekeeper, if < 0, we rollback and fail.
  
  if (result < 0) {
    await redis.incr(key); // Rollback
    return false;
  }
  
  return true;
}

export async function incrementProductStock(productId: string): Promise<void> {
    const key = `product:${productId}:stock`;
    await redis.incr(key);
}
