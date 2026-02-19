import { createHash, randomBytes } from "node:crypto"

const JWT_SECRET = randomBytes(32).toString("hex")
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000

export type Role = "admin" | "viewer"

export interface TokenPayload {
	userId: string
	role: Role
	iat: number
	exp: number
}

function base64UrlEncode(data: string): string {
	return Buffer.from(data).toString("base64url")
}

function base64UrlDecode(encoded: string): string {
	return Buffer.from(encoded, "base64url").toString("utf-8")
}

function sign(payload: string, secret: string): string {
	const hmac = createHash("sha256")
	hmac.update(`${payload}.${secret}`)
	return hmac.digest("base64url")
}

export function generateToken(userId: string, role: Role): string {
	const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
	const now = Date.now()
	const payload = base64UrlEncode(
		JSON.stringify({
			userId,
			role,
			iat: now,
			exp: now + TOKEN_EXPIRY_MS,
		}),
	)

	const signature = sign(`${header}.${payload}`, JWT_SECRET)
	return `${header}.${payload}.${signature}`
}

export function verifyToken(token: string): TokenPayload | null {
	const parts = token.split(".")
	if (parts.length !== 3) return null

	const [header, payload, signature] = parts
	const expectedSignature = sign(`${header}.${payload}`, JWT_SECRET)

	if (signature !== expectedSignature) return null

	try {
		const decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload

		if (decoded.exp < Date.now()) return null

		return decoded
	} catch {
		return null
	}
}

export function hashApiKey(apiKey: string): string {
	return createHash("sha256").update(apiKey).digest("hex")
}

export function extractBearerToken(authHeader: string | null): string | null {
	if (!authHeader) return null
	if (!authHeader.startsWith("Bearer ")) return null
	return authHeader.slice(7)
}
