import { describe, it, expect } from "bun:test"
import {
	mapStatusToColor,
	isServiceStale,
	formatServiceCard,
	createServiceGridData,
	formatLastChecked,
} from "../components/ServiceStatus"
import type { ServiceInfo } from "../api/types"

const NOW = Date.parse("2026-02-19T14:00:00.000Z")

function makeService(overrides?: Partial<ServiceInfo>): ServiceInfo {
	return {
		name: "Claude API",
		type: "api",
		status: "active",
		url: "https://api.anthropic.com",
		lastChecked: new Date(NOW - 30_000).toISOString(),
		...overrides,
	}
}

describe("ServiceStatus", () => {
	describe("mapStatusToColor", () => {
		it("maps active to green", () => expect(mapStatusToColor("active")).toBe("green"))
		it("maps degraded to yellow", () => expect(mapStatusToColor("degraded")).toBe("yellow"))
		it("maps offline to red", () => expect(mapStatusToColor("offline")).toBe("red"))
		it("maps unknown to grey", () => expect(mapStatusToColor("unknown")).toBe("grey"))
	})

	describe("isServiceStale", () => {
		it("returns false for recent check", () => {
			const recent = new Date(NOW - 60_000).toISOString()
			expect(isServiceStale(recent, NOW)).toBe(false)
		})

		it("returns true for old check", () => {
			const old = new Date(NOW - 10 * 60_000).toISOString()
			expect(isServiceStale(old, NOW)).toBe(true)
		})

		it("returns true for invalid date", () => {
			expect(isServiceStale("not-a-date", NOW)).toBe(true)
		})
	})

	describe("formatServiceCard", () => {
		it("creates card with correct status color", () => {
			const card = formatServiceCard(makeService(), NOW)
			expect(card.status).toBe("green")
			expect(card.isStale).toBe(false)
		})

		it("overrides to grey when stale", () => {
			const staleService = makeService({
				lastChecked: new Date(NOW - 10 * 60_000).toISOString(),
			})
			const card = formatServiceCard(staleService, NOW)
			expect(card.status).toBe("grey")
			expect(card.isStale).toBe(true)
		})
	})

	describe("createServiceGridData", () => {
		it("creates grid from services array", () => {
			const services = [
				makeService({ name: "A", status: "active" }),
				makeService({ name: "B", status: "offline" }),
				makeService({ name: "C", status: "degraded" }),
			]

			const grid = createServiceGridData(services, NOW)
			expect(grid.totalCount).toBe(3)
			expect(grid.activeCount).toBe(1)
			expect(grid.offlineCount).toBe(1)
		})

		it("handles empty services", () => {
			const grid = createServiceGridData([], NOW)
			expect(grid.totalCount).toBe(0)
			expect(grid.services).toHaveLength(0)
		})
	})

	describe("formatLastChecked", () => {
		it("formats seconds ago", () => {
			const recent = new Date(NOW - 30_000).toISOString()
			expect(formatLastChecked(recent, NOW)).toBe("30s ago")
		})

		it("formats minutes ago", () => {
			const fiveMin = new Date(NOW - 5 * 60_000).toISOString()
			expect(formatLastChecked(fiveMin, NOW)).toBe("5m ago")
		})

		it("formats hours ago", () => {
			const twoHours = new Date(NOW - 2 * 3600_000).toISOString()
			expect(formatLastChecked(twoHours, NOW)).toBe("2h ago")
		})

		it("returns never for invalid date", () => {
			expect(formatLastChecked("invalid", NOW)).toBe("never")
		})
	})
})
