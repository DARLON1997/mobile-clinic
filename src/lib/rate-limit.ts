import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Retourne null si Upstash n'est pas configuré (dev sans Redis)
function createLimiter(requests: number, window: `${number} ${"s"|"m"|"h"}`) {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Ratelimit({
    redis:   new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, window),
  })
}

// Singletons lazily initialisés
let _api:   Ratelimit | null | undefined = undefined
let _login: Ratelimit | null | undefined = undefined

function getApiLimiter()   { if (_api   === undefined) { _api   = createLimiter(100, "1 m") } return _api   }
function getLoginLimiter() { if (_login === undefined) { _login = createLimiter(5,   "1 h") } return _login }

// R7 : 100 req/min par IP
export async function checkApiLimit(ip: string): Promise<boolean> {
  const l = getApiLimiter()
  if (!l) return true
  const { success } = await l.limit(ip)
  return success
}

// R7 : max 5 tentatives de connexion par email/heure
export async function checkLoginLimit(
  identifier: string
): Promise<{ allowed: boolean; resetAt?: Date }> {
  const l = getLoginLimiter()
  if (!l) return { allowed: true }
  const { success, reset } = await l.limit(identifier)
  return success ? { allowed: true } : { allowed: false, resetAt: new Date(reset) }
}
