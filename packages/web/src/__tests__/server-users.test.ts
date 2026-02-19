import { describe, it, expect } from "bun:test"
import {
	createUserStore,
	createUser,
	findByApiKey,
	listUsers,
	deleteUser,
	ensureCommanderExists,
} from "../server/users"

describe("server/users", () => {
	it("creates a user with hashed api key", () => {
		const store = createUserStore()
		const user = createUser(store, "Test User", "secret-key", "viewer")

		expect(user.id).toBeTruthy()
		expect(user.name).toBe("Test User")
		expect(user.role).toBe("viewer")
		expect(user.apiKeyHash).not.toBe("secret-key")
		expect(user.createdAt).toBeTruthy()
	})

	it("finds user by api key", () => {
		const store = createUserStore()
		createUser(store, "Alice", "alice-key", "admin")

		const found = findByApiKey(store, "alice-key")
		expect(found).not.toBeNull()
		expect(found!.name).toBe("Alice")
	})

	it("returns null for unknown api key", () => {
		const store = createUserStore()
		createUser(store, "Alice", "alice-key", "admin")

		expect(findByApiKey(store, "wrong-key")).toBeNull()
	})

	it("lists all users", () => {
		const store = createUserStore()
		createUser(store, "A", "key-a", "admin")
		createUser(store, "B", "key-b", "viewer")

		const users = listUsers(store)
		expect(users).toHaveLength(2)
	})

	it("deletes a user by id", () => {
		const store = createUserStore()
		const user = createUser(store, "Temp", "temp-key", "viewer")

		expect(deleteUser(store, user.id)).toBe(true)
		expect(listUsers(store)).toHaveLength(0)
	})

	it("returns false when deleting non-existent user", () => {
		const store = createUserStore()
		expect(deleteUser(store, "no-such-id")).toBe(false)
	})

	it("ensureCommanderExists creates commander on first call", () => {
		const store = createUserStore()
		const commander = ensureCommanderExists(store, "cmd-key")

		expect(commander.name).toBe("Commander")
		expect(commander.role).toBe("admin")
	})

	it("ensureCommanderExists returns existing commander on second call", () => {
		const store = createUserStore()
		const first = ensureCommanderExists(store, "cmd-key")
		const second = ensureCommanderExists(store, "cmd-key")

		expect(first.id).toBe(second.id)
		expect(listUsers(store)).toHaveLength(1)
	})
})
