import { describe, it, expect } from "bun:test"
import { handleRequest, createRouter } from "@arachne/web"
import { generateToken, findByApiKey } from "@arachne/web"

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

describe("Web API integration", () => {
	it("full auth flow: login → access protected route", async () => {
		const deps = createRouter()
		const commanderKey = process.env["ARACHNE_COMMANDER_KEY"] ?? "commander-default-key"

		const loginResponse = await handleRequest(
			makeRequest("POST", "/api/auth/login", { body: { apiKey: commanderKey } }),
			deps,
		)
		expect(loginResponse.status).toBe(200)

		const loginBody = (await loginResponse.json()) as { data: { token: string } }
		const token = loginBody.data.token

		const budgetResponse = await handleRequest(
			makeRequest("GET", "/api/budget/summary", { token }),
			deps,
		)
		expect(budgetResponse.status).toBe(200)
	})

	it("viewer cannot access admin routes", async () => {
		const deps = createRouter()
		const viewerToken = generateToken("viewer-id", "viewer")

		const response = await handleRequest(
			makeRequest("GET", "/api/users", { token: viewerToken }),
			deps,
		)
		expect(response.status).toBe(403)
	})

	it("unauthenticated requests are rejected", async () => {
		const deps = createRouter()

		const routes = ["/api/budget/summary", "/api/tasks", "/api/services", "/api/skills", "/api/context"]
		for (const route of routes) {
			const response = await handleRequest(makeRequest("GET", route), deps)
			expect(response.status).toBe(401)
		}
	})

	it("health endpoint requires no auth", async () => {
		const deps = createRouter()
		const response = await handleRequest(makeRequest("GET", "/api/health"), deps)
		expect(response.status).toBe(200)
	})
})
