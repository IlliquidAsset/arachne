import { apiFetch } from "./client"
import type { ApiResponse, TaskInfo } from "./types"

export async function listActiveTasks(): Promise<ApiResponse<TaskInfo[]>> {
	return apiFetch<TaskInfo[]>("/api/tasks")
}

export async function getTaskStatus(id: string): Promise<ApiResponse<TaskInfo>> {
	return apiFetch<TaskInfo>(`/api/tasks/${encodeURIComponent(id)}`)
}
