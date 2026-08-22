/** Per-caller key for rate limiting; falls back to a constant off the edge (local dev). */
export function clientKey(req: Request): string {
  return req.headers.get('cf-connecting-ip') ?? 'local'
}

/** Returns true if the request is within budget. No binding (local dev) → always allowed. */
export async function allow(limiter: RateLimit | undefined, key: string): Promise<boolean> {
  if (!limiter) return true
  const { success } = await limiter.limit({ key })
  return success
}
