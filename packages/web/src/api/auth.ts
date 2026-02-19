import { apiFetch, setAuthToken } from "./client"
import type { ApiResponse, AuthTokenResponse } from "./types"

export async function login(apiKey: string): Promise<ApiResponse<AuthTokenResponse>> {
	const result = await apiFetch<AuthTokenResponse>("/api/auth/login", {
		method: "POST",
		body: JSON.stringify({ apiKey }),
	})

	if (result.ok && result.data) {
		setAuthToken(result.data.token)
	}

	return result
}

export async function register(
	name: string,
	apiKey: string,
): Promise<ApiResponse<AuthTokenResponse>> {
	return apiFetch<AuthTokenResponse>("/api/auth/register", {
		method: "POST",
		body: JSON.stringify({ name, apiKey }),
	})
}

export function logout(): void {
	setAuthToken(null)
}
