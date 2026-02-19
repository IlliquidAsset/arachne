import { describe, it, expect } from "bun:test"
import { canAccess, getRedirectPath, isAdminRoute } from "../components/AccessControl"

describe("AccessControl", () => {
	describe("canAccess", () => {
		it("allows login page without auth", () => {
			expect(canAccess("/login", null)).toBe(true)
		})

		it("blocks other pages without auth", () => {
			expect(canAccess("/dashboard", null)).toBe(false)
			expect(canAccess("/tasks", null)).toBe(false)
		})

		it("allows viewer access to dashboard", () => {
			expect(canAccess("/dashboard", "viewer")).toBe(true)
		})

		it("allows viewer access to tasks", () => {
			expect(canAccess("/tasks", "viewer")).toBe(true)
		})

		it("blocks viewer from settings", () => {
			expect(canAccess("/settings", "viewer")).toBe(false)
			expect(canAccess("/settings/users", "viewer")).toBe(false)
		})

		it("allows admin access to everything", () => {
			expect(canAccess("/dashboard", "admin")).toBe(true)
			expect(canAccess("/settings", "admin")).toBe(true)
			expect(canAccess("/settings/users", "admin")).toBe(true)
		})
	})

	describe("getRedirectPath", () => {
		it("redirects to login when unauthenticated", () => {
			expect(getRedirectPath(null, "/dashboard")).toBe("/login")
		})

		it("redirects viewer away from admin routes", () => {
			expect(getRedirectPath("viewer", "/settings")).toBe("/dashboard")
		})

		it("returns null when access is allowed", () => {
			expect(getRedirectPath("admin", "/settings")).toBeNull()
			expect(getRedirectPath("viewer", "/dashboard")).toBeNull()
		})
	})

	describe("isAdminRoute", () => {
		it("identifies admin routes", () => {
			expect(isAdminRoute("/settings")).toBe(true)
			expect(isAdminRoute("/settings/users")).toBe(true)
		})

		it("identifies non-admin routes", () => {
			expect(isAdminRoute("/dashboard")).toBe(false)
			expect(isAdminRoute("/tasks")).toBe(false)
		})
	})
})
