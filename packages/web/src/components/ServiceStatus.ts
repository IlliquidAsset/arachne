import type { ServiceInfo } from "../api/types"

export type StatusColor = "green" | "yellow" | "red" | "grey"

export interface ServiceCard {
	name: string
	type: string
	status: StatusColor
	url: string
	lastChecked: string
	isStale: boolean
}

export interface ServiceGridData {
	services: ServiceCard[]
	totalCount: number
	activeCount: number
	offlineCount: number
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000

export function mapStatusToColor(status: ServiceInfo["status"]): StatusColor {
	switch (status) {
		case "active":
			return "green"
		case "degraded":
			return "yellow"
		case "offline":
			return "red"
		default:
			return "grey"
	}
}

export function isServiceStale(lastChecked: string, now = Date.now()): boolean {
	const checkedAt = new Date(lastChecked).getTime()
	if (Number.isNaN(checkedAt)) return true
	return now - checkedAt > STALE_THRESHOLD_MS
}

export function formatServiceCard(service: ServiceInfo, now = Date.now()): ServiceCard {
	const stale = isServiceStale(service.lastChecked, now)

	return {
		name: service.name,
		type: service.type,
		status: stale ? "grey" : mapStatusToColor(service.status),
		url: service.url,
		lastChecked: service.lastChecked,
		isStale: stale,
	}
}

export function createServiceGridData(
	services: ServiceInfo[],
	now = Date.now(),
): ServiceGridData {
	const cards = services.map((s) => formatServiceCard(s, now))

	return {
		services: cards,
		totalCount: cards.length,
		activeCount: cards.filter((c) => c.status === "green").length,
		offlineCount: cards.filter((c) => c.status === "red" || c.status === "grey").length,
	}
}

export function formatLastChecked(lastChecked: string, now = Date.now()): string {
	const checkedAt = new Date(lastChecked).getTime()
	if (Number.isNaN(checkedAt)) return "never"

	const diffMs = now - checkedAt
	const diffSec = Math.floor(diffMs / 1000)

	if (diffSec < 60) return `${diffSec}s ago`
	if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
	return `${Math.floor(diffSec / 3600)}h ago`
}
