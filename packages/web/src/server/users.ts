import { randomUUID } from "node:crypto"
import { hashApiKey, type Role } from "./auth"

export interface User {
	id: string
	name: string
	apiKeyHash: string
	role: Role
	createdAt: string
}

export interface UserStore {
	users: Map<string, User>
}

export function createUserStore(): UserStore {
	return { users: new Map() }
}

export function createUser(
	store: UserStore,
	name: string,
	apiKey: string,
	role: Role,
): User {
	const id = randomUUID()
	const user: User = {
		id,
		name,
		apiKeyHash: hashApiKey(apiKey),
		role,
		createdAt: new Date().toISOString(),
	}

	store.users.set(id, user)
	return user
}

export function findByApiKey(store: UserStore, apiKey: string): User | null {
	const hash = hashApiKey(apiKey)
	for (const user of store.users.values()) {
		if (user.apiKeyHash === hash) return user
	}
	return null
}

export function listUsers(store: UserStore): User[] {
	return Array.from(store.users.values())
}

export function deleteUser(store: UserStore, id: string): boolean {
	return store.users.delete(id)
}

export function ensureCommanderExists(
	store: UserStore,
	commanderApiKey: string,
): User {
	const existing = findByApiKey(store, commanderApiKey)
	if (existing) return existing
	return createUser(store, "Commander", commanderApiKey, "admin")
}
