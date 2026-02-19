import { apiFetch } from "./client"
import type { ApiResponse, ContextInfo } from "./types"

export async function getCurrentContext(): Promise<ApiResponse<ContextInfo>> {
	return apiFetch<ContextInfo>("/api/context")
}

export async function setRole(role: string): Promise<ApiResponse<ContextInfo>> {
	return apiFetch<ContextInfo>("/api/context/role", {
		method: "PUT",
		body: JSON.stringify({ role }),
	})
}
