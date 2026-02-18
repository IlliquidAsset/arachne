import type { AuthConfig, AuthResult, RateLimitEntry } from "./types"
import { validateApiKey } from "./api-key"

const RATE_LIMIT_MAX = 100
const RATE_LIMIT_WINDOW_MS = 60_000

export function createAuthMiddleware(config: AuthConfig) {
  const rateLimitMap = new Map<string, RateLimitEntry>()

  function extractToken(req: Request): string | null {
    const authHeader = req.headers.get("authorization")
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(\S+)$/i)
      if (match) return match[1]
    }

    try {
      const url = new URL(req.url)
      const tokenParam = url.searchParams.get("token")
      if (tokenParam) return tokenParam
    } catch {}

    return null
  }

  function checkRateLimit(key: string): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(key)

    if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.set(key, { count: 1, windowStart: now })
      return true
    }

    entry.count += 1
    return entry.count <= RATE_LIMIT_MAX
  }

  function authenticate(req: Request): AuthResult {
    if (!config.enabled) {
      return { authorized: true }
    }

    if (!config.apiKey) {
      return { authorized: true }
    }

    const token = extractToken(req)

    if (!token) {
      return {
        authorized: false,
        error: "Missing authentication token",
        statusCode: 401,
      }
    }

    if (!validateApiKey(token, config.apiKey)) {
      return {
        authorized: false,
        error: "Invalid authentication token",
        statusCode: 401,
      }
    }

    if (!checkRateLimit(token)) {
      return {
        authorized: false,
        error: "Rate limit exceeded. Try again later.",
        statusCode: 429,
      }
    }

    return { authorized: true }
  }

  return { authenticate, _rateLimitMap: rateLimitMap }
}
