import { describe, it, expect } from "bun:test"
import { handleRequest, createRouter } from "../server/router"
import { generateToken } from "../server/auth"
import { findByApiKey } from "../server/users"

function makeRequest(
	method: string,
	path: string,
	options: { body?: unknown; token?: string } = {},
): Request {
	const headers: Record<string, string> = { "Content-Type": "application/json" }
	if (options.token) headers["Authorization"] = `Bearer ${options.token}`

	return new Request(`http://localhost:3100${path}`, {
		method,
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined,
	})
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
	return response.json() as Promise<Record<string, unknown>>
}

describe("server/router", () => {
	describe("GET /api/health", () => {
		it("returns 200 with ok status", async () => {
			const deps = createRouter()
			const response = await handleRequest(makeRequest("GET", "/api/health"), deps)

			expect(response.status).toBe(200)
			const body = await parseJson(response)
			expect(body.ok).toBe(true)
			expect((body.data as Record<string, unknown>).status).toBe("ok")
		})
	})

	describe("POST /api/auth/login", () => {
		it("returns 401 for invalid api key", async () => {
			const deps = createRouter()
			const response = await handleRequest(
				makeRequest("POST", "/api/auth/login", { body: { apiKey: "wrong" } }),
				deps,
			)

			expect(response.status).toBe(401)
		})

		it("returns JWT token for valid commander key", async () => {
			const deps = createRouter()
			const commanderKey = process.env["ARACHNE_COMMANDER_KEY"] ?? "commander-default-key"
			const response = await handleRequest(
				makeRequest("POST", "/api/auth/login", { body: { apiKey: commanderKey } }),
				deps,
			)

			expect(response.status).toBe(200)
			const body = await parseJson(response)
			expect(body.ok).toBe(true)
			const data = body.data as Record<string, unknown>
			expect(data.token).toBeTruthy()
			expect(data.role).toBe("admin")
		})

		it("returns 400 when apiKey missing", async () => {
			const deps = createRouter()
			const response = await handleRequest(
				makeRequest("POST", "/api/auth/login", { body: {} }),
				deps,
			)

			expect(response.status).toBe(400)
		})
	})

	describe("protected routes", () => {
		it("returns 401 without auth token", async () => {
			const deps = createRouter()
			const response = await handleRequest(makeRequest("GET", "/api/budget/summary"), deps)
			expect(response.status).toBe(401)
		})

		it("returns 200 with valid auth token", async () => {
			const deps = createRouter()
			const commander = findByApiKey(
				deps.userStore,
				process.env["ARACHNE_COMMANDER_KEY"] ?? "commander-default-key",
			)!
			const token = generateToken(commander.id, commander.role)

			const response = await handleRequest(
				makeRequest("GET", "/api/budget/summary", { token }),
				deps,
			)

			expect(response.status).toBe(200)
			const body = await parseJson(response)
			expect(body.ok).toBe(true)
		})

		it("protects /api/context", async () => {
			const deps = createRouter()
			const response = await handleRequest(makeRequest("GET", "/api/context"), deps)
			expect(response.status).toBe(401)
		})

		it("protects /api/tasks", async () => {
			const deps = createRouter()
			const response = await handleRequest(makeRequest("GET", "/api/tasks"), deps)
			expect(response.status).toBe(401)
		})

		it("protects /api/services", async () => {
			const deps = createRouter()
			const response = await handleRequest(makeRequest("GET", "/api/services"), deps)
			expect(response.status).toBe(401)
		})

		it("protects /api/skills", async () => {
			const deps = createRouter()
			const response = await handleRequest(makeRequest("GET", "/api/skills"), deps)
			expect(response.status).toBe(401)
		})
	})

	describe("admin routes", () => {
		it("GET /api/users requires admin", async () => {
			const deps = createRouter()
			const viewerToken = generateToken("viewer-1", "viewer")
			const response = await handleRequest(
				makeRequest("GET", "/api/users", { token: viewerToken }),
				deps,
			)
			expect(response.status).toBe(403)
		})

		it("GET /api/users returns users for admin", async () => {
			const deps = createRouter()
			const commander = findByApiKey(
				deps.userStore,
				process.env["ARACHNE_COMMANDER_KEY"] ?? "commander-default-key",
			)!
			const token = generateToken(commander.id, "admin")

			const response = await handleRequest(
				makeRequest("GET", "/api/users", { token }),
				deps,
			)

			expect(response.status).toBe(200)
			const body = await parseJson(response)
			const data = body.data as unknown[]
			expect(data.length).toBeGreaterThanOrEqual(1)
		})
	})

	describe("CORS", () => {
		it("responds to OPTIONS with CORS headers", async () => {
			const deps = createRouter()
			const response = await handleRequest(makeRequest("OPTIONS", "/api/health"), deps)

			expect(response.status).toBe(204)
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
			expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET")
		})
	})

	describe("404", () => {
		it("returns 404 for unknown routes", async () => {
			const deps = createRouter()
			const response = await handleRequest(makeRequest("GET", "/api/unknown"), deps)
			expect(response.status).toBe(404)
		})
	})
})
