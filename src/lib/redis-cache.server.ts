// Redis L2 cache — STUBBED for Lovable Cloud (Cloudflare Workers).
// ioredis uses raw TCP and Node native bindings, neither of which works
// in Cloudflare Workers. All operations are no-ops; the L1 in-memory
// cache in the redirect path keeps serving hot links.
// TODO(VPS): swap back to ioredis when migrating to self-hosted VPS.

export async function redisGet<T = unknown>(_key: string): Promise<T | null> {
  return null;
}

export async function redisSet(
  _key: string,
  _value: unknown,
  _ttlSeconds?: number,
): Promise<void> {
  return;
}

export async function redisDel(..._keys: string[]): Promise<void> {
  return;
}

export async function redisMGet<T = unknown>(
  keys: string[],
): Promise<(T | null)[]> {
  return keys.map(() => null);
}

export async function redisIncr(_key: string, _ttlSeconds?: number): Promise<number> {
  return 0;
}

export async function redisExists(_key: string): Promise<boolean> {
  return false;
}

export function isRedisEnabled(): boolean {
  return false;
}

export async function redisFlushPrefix(_prefix: string): Promise<void> {
  return;
}
