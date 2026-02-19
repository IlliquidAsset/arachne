import { apiFetch } from "./client"
import type { ApiResponse, ServiceInfo } from "./types"

export async function listServices(): Promise<ApiResponse<ServiceInfo[]>> {
	return apiFetch<ServiceInfo[]>("/api/services")
}

export async function getServiceHealth(
	id: string,
): Promise<ApiResponse<ServiceInfo>> {
	return apiFetch<ServiceInfo>(`/api/services/${encodeURIComponent(id)}`)
}
