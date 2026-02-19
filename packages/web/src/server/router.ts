import {
	extractBearerToken,
	verifyToken,
	generateToken,
	type TokenPayload,
} from "./auth"
import {
	createUserStore,
	ensureCommanderExists,
	findByApiKey,
	listUsers,
	createUser,
	deleteUser,
	type UserStore,
} from "./users"

export interface RouterDeps {
	userStore: UserStore
	startedAt: number
}

interface RouteContext {
	url: URL
	method: string
	body: unknown
	auth: TokenPayload | null
}

type RouteHandler = (ctx: RouteContext, deps: RouterDeps) => Response | Promise<Response>

function json<T>(data: T, status = 200): Response {
	return new Response(JSON.stringify({ ok: status < 400, data }), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Authorization, Content-Type",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		},
	})
}

function error(message: string, status = 400): Response {
	return new Response(JSON.stringify({ ok: false, error: message }), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Authorization, Content-Type",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		},
	})
}

function requireAuth(ctx: RouteContext): TokenPayload | null {
	if (!ctx.auth) return null
	return ctx.auth
}

function requireAdmin(ctx: RouteContext): TokenPayload | null {
	const auth = requireAuth(ctx)
	if (!auth || auth.role !== "admin") return null
	return auth
}

const healthHandler: RouteHandler = (_ctx, deps) => {
	const uptime = Math.floor((Date.now() - deps.startedAt) / 1000)
	return json({
		status: "ok",
		uptime,
		timestamp: new Date().toISOString(),
	})
}

const loginHandler: RouteHandler = async (ctx, deps) => {
	const body = ctx.body as { apiKey?: string } | null
	if (!body?.apiKey) return error("apiKey required", 400)

	const user = findByApiKey(deps.userStore, body.apiKey)
	if (!user) return error("Invalid API key", 401)

	const token = generateToken(user.id, user.role)
	return json({
		token,
		userId: user.id,
		role: user.role,
		expiresAt: new Date(Date.now() + 86400000).toISOString(),
	})
}

const registerHandler: RouteHandler = async (ctx, deps) => {
	const admin = requireAdmin(ctx)
	if (!admin) return error("Admin access required", 403)

	const body = ctx.body as { name?: string; apiKey?: string; role?: string } | null
	if (!body?.name || !body?.apiKey) return error("name and apiKey required", 400)

	const role = body.role === "admin" ? "admin" as const : "viewer" as const
	const user = createUser(deps.userStore, body.name, body.apiKey, role)
	return json({ id: user.id, name: user.name, role: user.role, createdAt: user.createdAt }, 201)
}

const listUsersHandler: RouteHandler = (ctx, deps) => {
	const admin = requireAdmin(ctx)
	if (!admin) return error("Admin access required", 403)

	const users = listUsers(deps.userStore).map((u) => ({
		id: u.id,
		name: u.name,
		role: u.role,
		createdAt: u.createdAt,
	}))
	return json(users)
}

const deleteUserHandler: RouteHandler = (ctx, deps) => {
	const admin = requireAdmin(ctx)
	if (!admin) return error("Admin access required", 403)

	const id = ctx.url.pathname.split("/").pop()
	if (!id) return error("User ID required", 400)

	const deleted = deleteUser(deps.userStore, id)
	if (!deleted) return error("User not found", 404)
	return json({ deleted: true })
}

const budgetSummaryHandler: RouteHandler = (ctx) => {
	if (!requireAuth(ctx)) return error("Authentication required", 401)

	return json({
		totalUsd: 0,
		byProvider: {},
		byProject: {},
		period: "day",
	})
}

const contextHandler: RouteHandler = (ctx) => {
	if (!requireAuth(ctx)) return error("Authentication required", 401)

	return json({
		role: "work",
		timeOfDay: "morning",
		activeProject: null,
	})
}

const tasksHandler: RouteHandler = (ctx) => {
	if (!requireAuth(ctx)) return error("Authentication required", 401)
	return json([])
}

const servicesHandler: RouteHandler = (ctx) => {
	if (!requireAuth(ctx)) return error("Authentication required", 401)
	return json([])
}

const skillsHandler: RouteHandler = (ctx) => {
	if (!requireAuth(ctx)) return error("Authentication required", 401)
	return json([])
}

function matchRoute(
	method: string,
	pathname: string,
): RouteHandler | null {
	if (method === "GET" && pathname === "/api/health") return healthHandler
	if (method === "POST" && pathname === "/api/auth/login") return loginHandler
	if (method === "POST" && pathname === "/api/auth/register") return registerHandler
	if (method === "GET" && pathname === "/api/users") return listUsersHandler
	if (method === "DELETE" && pathname.startsWith("/api/users/")) return deleteUserHandler
	if (method === "GET" && pathname === "/api/budget/summary") return budgetSummaryHandler
	if (method === "GET" && pathname === "/api/context") return contextHandler
	if (method === "GET" && pathname === "/api/tasks") return tasksHandler
	if (method === "GET" && pathname === "/api/services") return servicesHandler
	if (method === "GET" && pathname === "/api/skills") return skillsHandler
	return null
}

export async function handleRequest(
	request: Request,
	deps: RouterDeps,
): Promise<Response> {
	const url = new URL(request.url)
	const method = request.method

	if (method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "Authorization, Content-Type",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			},
		})
	}

	const handler = matchRoute(method, url.pathname)
	if (!handler) return error("Not found", 404)

	let body: unknown = null
	if (method === "POST" || method === "PUT") {
		try {
			body = await request.json()
		} catch {
			body = null
		}
	}

	const authHeader = request.headers.get("Authorization")
	const token = extractBearerToken(authHeader)
	const auth = token ? verifyToken(token) : null

	return handler({ url, method, body, auth }, deps)
}

export function createRouter(): RouterDeps {
	const userStore = createUserStore()
	const commanderKey = process.env["ARACHNE_COMMANDER_KEY"] ?? "commander-default-key"
	ensureCommanderExists(userStore, commanderKey)

	return {
		userStore,
		startedAt: Date.now(),
	}
}
