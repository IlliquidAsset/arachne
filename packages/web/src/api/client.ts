// Base API client with JWT auth header injection

import type { ApiResponse } from "./types"

let authToken: string | null = null

export function setAuthToken(token: string | null): void {
	authToken = token
}

export function getAuthToken(): string | null {
	return authToken
}

export async function apiFetch<T>(
	path: string,
	options: RequestInit = {},
): Promise<ApiResponse<T>> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(options.headers as Record<string, string> | undefined),
	}

	if (authToken) {
		headers["Authorization"] = `Bearer ${authToken}`
	}

	try {
		const response = await fetch(path, { ...options, headers })
		const body = (await response.json()) as ApiResponse<T>

		if (!response.ok) {
			return { ok: false, error: body.error ?? `HTTP ${response.status}` }
		}

		return body
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return { ok: false, error: message }
	}
}
