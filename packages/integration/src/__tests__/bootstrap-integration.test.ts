import { describe, it, expect } from "bun:test"
import { bootstrap, type BootstrapDeps } from "@arachne/bootstrap"

function createMockBootstrapDeps(overrides?: Partial<BootstrapDeps>): BootstrapDeps {
	const files: Record<string, string> = {}
	const dirs = new Set<string>()
	const logs: string[] = []

	return {
		homeDir: "/mock/home",
		env: {
			ANTHROPIC_API_KEY: "sk-ant-test-key-123",
			SHELL: "/bin/zsh",
		},
		existsSync: (path) => files[path] !== undefined || dirs.has(path),
		readFile: (path) => {
			if (files[path] !== undefined) return files[path]
			throw new Error(`ENOENT: ${path}`)
		},
		writeFile: (path, content) => {
			files[path] = content
		},
		mkdir: (path) => {
			dirs.add(path)
		},
		readDir: () => [],
		isDirectory: () => false,
		execSync: (cmd) => {
			if (cmd.includes("bun --version")) return "1.3.5"
			if (cmd.includes("git --version")) return "git version 2.43"
			throw new Error(`command not found: ${cmd}`)
		},
		platform: () => "darwin",
		openDatabase: () => ({
			close: () => {},
			query: () => [{ ok: 1 }],
		}),
		initDb: () => {},
		log: (msg) => logs.push(msg),
		...overrides,
	}
}

describe("Bootstrap → Operational integration", () => {
	it("completes full bootstrap sequence with all steps passing", () => {
		const deps = createMockBootstrapDeps()
		const result = bootstrap(deps)

		expect(result.success).toBe(true)
		expect(result.steps).toHaveLength(8)
		expect(result.steps.every((s) => s.success)).toBe(true)
	})

	it("discovers Anthropic service from env var", () => {
		const deps = createMockBootstrapDeps()
		const result = bootstrap(deps)

		const anthropic = result.serviceDiscovery!.services.find((s) => s.name === "Anthropic")
		expect(anthropic).toBeDefined()
		expect(anthropic!.available).toBe(true)
	})

	it("detects bun and git tools", () => {
		const deps = createMockBootstrapDeps()
		const result = bootstrap(deps)

		const bun = result.envScan!.tools.find((t) => t.name === "bun")
		expect(bun!.available).toBe(true)
		expect(bun!.version).toBe("1.3.5")
	})

	it("bootstrap is idempotent — running twice produces same result", () => {
		const deps = createMockBootstrapDeps()
		const first = bootstrap(deps)
		const second = bootstrap(deps)

		expect(first.success).toBe(second.success)
		expect(first.steps.length).toBe(second.steps.length)
	})
})
