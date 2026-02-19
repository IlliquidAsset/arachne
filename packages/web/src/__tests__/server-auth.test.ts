import { describe, it, expect } from "bun:test"
import {
	generateToken,
	verifyToken,
	hashApiKey,
	extractBearerToken,
} from "../server/auth"

describe("server/auth", () => {
	describe("generateToken + verifyToken", () => {
		it("generates a valid JWT that can be verified", () => {
			const token = generateToken("user-1", "admin")
			const payload = verifyToken(token)

			expect(payload).not.toBeNull()
			expect(payload!.userId).toBe("user-1")
			expect(payload!.role).toBe("admin")
		})

		it("generates tokens with different roles", () => {
			const adminToken = generateToken("u1", "admin")
			const viewerToken = generateToken("u2", "viewer")

			expect(verifyToken(adminToken)!.role).toBe("admin")
			expect(verifyToken(viewerToken)!.role).toBe("viewer")
		})

		it("rejects tampered tokens", () => {
			const token = generateToken("user-1", "admin")
			const tampered = token.slice(0, -5) + "xxxxx"

			expect(verifyToken(tampered)).toBeNull()
		})

		it("rejects malformed tokens", () => {
			expect(verifyToken("not-a-jwt")).toBeNull()
			expect(verifyToken("")).toBeNull()
			expect(verifyToken("a.b")).toBeNull()
		})

		it("includes iat and exp in payload", () => {
			const before = Date.now()
			const token = generateToken("user-1", "admin")
			const payload = verifyToken(token)!

			expect(payload.iat).toBeGreaterThanOrEqual(before)
			expect(payload.exp).toBeGreaterThan(payload.iat)
		})
	})

	describe("hashApiKey", () => {
		it("produces consistent hashes", () => {
			const hash1 = hashApiKey("my-secret-key")
			const hash2 = hashApiKey("my-secret-key")
			expect(hash1).toBe(hash2)
		})

		it("produces different hashes for different keys", () => {
			const hash1 = hashApiKey("key-a")
			const hash2 = hashApiKey("key-b")
			expect(hash1).not.toBe(hash2)
		})

		it("returns a hex string", () => {
			const hash = hashApiKey("test")
			expect(hash).toMatch(/^[0-9a-f]{64}$/)
		})
	})

	describe("extractBearerToken", () => {
		it("extracts token from Bearer header", () => {
			expect(extractBearerToken("Bearer abc123")).toBe("abc123")
		})

		it("returns null for missing header", () => {
			expect(extractBearerToken(null)).toBeNull()
		})

		it("returns null for non-Bearer header", () => {
			expect(extractBearerToken("Basic abc123")).toBeNull()
		})

		it("returns null for empty string", () => {
			expect(extractBearerToken("")).toBeNull()
		})
	})
})
