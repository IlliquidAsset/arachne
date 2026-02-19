import { apiFetch } from "./client"
import type { ApiResponse, SkillInfo, SkillHistoryEntry } from "./types"

export async function listSkills(): Promise<ApiResponse<SkillInfo[]>> {
	return apiFetch<SkillInfo[]>("/api/skills")
}

export async function getSkillHistory(): Promise<ApiResponse<SkillHistoryEntry[]>> {
	return apiFetch<SkillHistoryEntry[]>("/api/skills/history")
}
