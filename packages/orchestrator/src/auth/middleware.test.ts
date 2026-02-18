import { describe, test, expect } from "bun:test"
import { createAuthMiddleware } from "./middleware"

const VALID_KEY = "a".repeat(64)

function makeRequest(opts: { bearer?: string; token?: string; url?: string } = {}): Request {
  const base = opts.url ?? "http://localhost:4100/api/status"
  const url = opts.token ? `${base}?token=${opts.token}` : base
  const headers: Record<string, string> = {}
  if (opts.bearer) {
    headers["Authorization"] = `Bearer ${opts.bearer}`
  }
  return new Request(url, { headers })
}

describe("createAuthMiddleware", () => {
  describe("when auth is disabled", () => {
    test("allows all requests", () => {
      const { authenticate } = createAuthMiddleware({ apiKey: VALID_KEY, enabled: false })
      const result = authenticate(makeRequest())
      expect(result.authorized).toBe(true)
    })
  })

  describe("when no apiKey is configured", () => {
    test("allows all requests", () => {
      const { authenticate } = createAuthMiddleware({ apiKey: "", enabled: true })
      const result = authenticate(makeRequest())
      expect(result.authorized).toBe(true)
    })
  })

  describe("when auth is enabled with apiKey", () => {
    const config = { apiKey: VALID_KEY, enabled: true }

    test("rejects requests with no auth (401)", () => {
      const { authenticate } = createAuthMiddleware(config)
      const result = authenticate(makeRequest())

      expect(result.authorized).toBe(false)
      expect(result.statusCode).toBe(401)
      expect(result.error).toContain("Missing")
    })

    test("rejects requests with invalid bearer token (401)", () => {
      const { authenticate } = createAuthMiddleware(config)
      const result = authenticate(makeRequest({ bearer: "wrong-key" }))

      expect(result.authorized).toBe(false)
      expect(result.statusCode).toBe(401)
      expect(result.error).toContain("Invalid")
    })

    test("accepts valid bearer token", () => {
      const { authenticate } = createAuthMiddleware(config)
      const result = authenticate(makeRequest({ bearer: VALID_KEY }))
      expect(result.authorized).toBe(true)
    })

    test("accepts valid token query parameter", () => {
      const { authenticate } = createAuthMiddleware(config)
      const result = authenticate(makeRequest({ token: VALID_KEY }))
      expect(result.authorized).toBe(true)
    })

    test("prefers bearer header over query param", () => {
      const { authenticate } = createAuthMiddleware(config)
      const result = authenticate(makeRequest({ bearer: VALID_KEY, token: "wrong" }))
      expect(result.authorized).toBe(true)
    })

    test("rejects malformed Authorization header", () => {
      const { authenticate } = createAuthMiddleware(config)
      const req = new Request("http://localhost:4100/", {
        headers: { Authorization: "Basic abc123" },
      })
      const result = authenticate(req)
      expect(result.authorized).toBe(false)
      expect(result.statusCode).toBe(401)
    })
  })

  describe("rate limiting", () => {
    test("allows up to 100 requests per minute", () => {
      const { authenticate } = createAuthMiddleware({ apiKey: VALID_KEY, enabled: true })

      for (let i = 0; i < 100; i++) {
        const result = authenticate(makeRequest({ bearer: VALID_KEY }))
        expect(result.authorized).toBe(true)
      }
    })

    test("rejects the 101st request with 429", () => {
      const { authenticate } = createAuthMiddleware({ apiKey: VALID_KEY, enabled: true })

      for (let i = 0; i < 100; i++) {
        authenticate(makeRequest({ bearer: VALID_KEY }))
      }

      const result = authenticate(makeRequest({ bearer: VALID_KEY }))
      expect(result.authorized).toBe(false)
      expect(result.statusCode).toBe(429)
      expect(result.error).toContain("Rate limit")
    })

    test("resets after window expires", () => {
      const { authenticate, _rateLimitMap } = createAuthMiddleware({
        apiKey: VALID_KEY,
        enabled: true,
      })

      for (let i = 0; i < 100; i++) {
        authenticate(makeRequest({ bearer: VALID_KEY }))
      }

      const entry = _rateLimitMap.get(VALID_KEY)!
      entry.windowStart = Date.now() - 61_000

      const result = authenticate(makeRequest({ bearer: VALID_KEY }))
      expect(result.authorized).toBe(true)
    })
  })
})
