import type { UserRole } from "../api/types"

export interface AccessRule {
	path: string
	requiredRole: UserRole | "any"
}

const ACCESS_RULES: AccessRule[] = [
	{ path: "/dashboard", requiredRole: "any" },
	{ path: "/tasks", requiredRole: "any" },
	{ path: "/skills", requiredRole: "any" },
	{ path: "/settings", requiredRole: "admin" },
	{ path: "/settings/users", requiredRole: "admin" },
	{ path: "/login", requiredRole: "any" },
]

export function canAccess(path: string, role: UserRole | null): boolean {
	if (path === "/login") return true
	if (!role) return false

	const rule = ACCESS_RULES.find((r) => path.startsWith(r.path))
	if (!rule) return role === "admin"

	if (rule.requiredRole === "any") return true
	return role === rule.requiredRole
}

export function getRedirectPath(role: UserRole | null, targetPath: string): string | null {
	if (!role) return "/login"
	if (!canAccess(targetPath, role)) return "/dashboard"
	return null
}

export function isAdminRoute(path: string): boolean {
	return ACCESS_RULES.some((r) => path.startsWith(r.path) && r.requiredRole === "admin")
}
