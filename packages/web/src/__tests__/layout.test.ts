import { describe, it, expect } from "bun:test"
import {
	getBreakpoint,
	getLayoutConfig,
	getVisibleNavItems,
	NAV_ITEMS,
} from "../components/Layout"

describe("Layout", () => {
	describe("getBreakpoint", () => {
		it("returns mobile below 640px", () => {
			expect(getBreakpoint(375)).toBe("mobile")
			expect(getBreakpoint(639)).toBe("mobile")
		})

		it("returns tablet between 640-1023px", () => {
			expect(getBreakpoint(640)).toBe("tablet")
			expect(getBreakpoint(768)).toBe("tablet")
			expect(getBreakpoint(1023)).toBe("tablet")
		})

		it("returns desktop at 1024px+", () => {
			expect(getBreakpoint(1024)).toBe("desktop")
			expect(getBreakpoint(1440)).toBe("desktop")
		})
	})

	describe("getLayoutConfig", () => {
		it("mobile: hamburger visible, sidebar hidden, 1 column", () => {
			const config = getLayoutConfig(375)
			expect(config.sidebarVisible).toBe(false)
			expect(config.hamburgerVisible).toBe(true)
			expect(config.ribbonOrientation).toBe("vertical")
			expect(config.gridColumns).toBe(1)
		})

		it("tablet: hamburger visible, 2 columns", () => {
			const config = getLayoutConfig(768)
			expect(config.hamburgerVisible).toBe(true)
			expect(config.gridColumns).toBe(2)
			expect(config.ribbonOrientation).toBe("horizontal")
		})

		it("desktop: sidebar visible, hamburger hidden, 4 columns", () => {
			const config = getLayoutConfig(1440)
			expect(config.sidebarVisible).toBe(true)
			expect(config.hamburgerVisible).toBe(false)
			expect(config.gridColumns).toBe(4)
		})
	})

	describe("getVisibleNavItems", () => {
		it("admin sees all items", () => {
			const items = getVisibleNavItems("admin")
			expect(items).toHaveLength(NAV_ITEMS.length)
		})

		it("viewer does not see admin-only items", () => {
			const items = getVisibleNavItems("viewer")
			expect(items.length).toBeLessThan(NAV_ITEMS.length)
			expect(items.every((i) => !i.adminOnly)).toBe(true)
		})
	})
})
