// API response types for the Arachne web dashboard

export interface ApiResponse<T> {
	ok: boolean
	data?: T
	error?: string
}

export interface HealthStatus {
	status: "ok" | "degraded" | "down"
	uptime: number
	timestamp: string
}

export interface AuthTokenResponse {
	token: string
	userId: string
	role: UserRole
	expiresAt: string
}

export type UserRole = "admin" | "viewer"

export interface UserInfo {
	id: string
	name: string
	role: UserRole
	createdAt: string
}

export interface SpendingSummary {
	totalUsd: number
	byProvider: Record<string, { tokensIn: number; tokensOut: number; costUsd: number }>
	byProject: Record<string, number>
	period: "day" | "week" | "month"
}

export interface ContextInfo {
	role: string
	timeOfDay: string
	activeProject: string | null
}

export interface TaskInfo {
	id: string
	name: string
	status: "queued" | "running" | "completed" | "failed"
	track: "deterministic" | "llm"
	project: string
	startedAt: string
	duration: number
}

export interface ServiceInfo {
	name: string
	type: string
	status: "active" | "degraded" | "offline" | "unknown"
	url: string
	lastChecked: string
}

export interface SkillInfo {
	name: string
	scope: string
	enabled: boolean
	lastModified: string
}

export interface SkillHistoryEntry {
	skillName: string
	action: string
	timestamp: string
	success: boolean
}
