import { apiFetch } from "./client"
import type { ApiResponse, SpendingSummary } from "./types"

export async function getSpendingSummary(
	period: "day" | "week" | "month" = "day",
): Promise<ApiResponse<SpendingSummary>> {
	return apiFetch<SpendingSummary>(`/api/budget/summary?period=${period}`)
}

export async function getProviderBreakdown(): Promise<
	ApiResponse<SpendingSummary["byProvider"]>
> {
	return apiFetch<SpendingSummary["byProvider"]>("/api/budget/providers")
}
