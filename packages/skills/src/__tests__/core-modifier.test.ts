import { describe, it, expect } from "bun:test"
import { join } from "node:path"
import {
	FORK_RELATIVE_PATH,
	OH_MY_OPENCODE_REPO,
	ensureFork,
	createBranch,
	applyModification,
	runTests,
	mergeBranch,
	rollback,
	modifyCore,
	type CoreModifierDependencies,
	type ExecResult,
} from "../core-modifier"

interface ExecCall {
	command: string
	args: string[]
	options?: { cwd?: string }
}

interface SkillActionCall {
	skillName: string
	action: string
	diffSummary?: string | null
	success?: boolean
}

interface MockOptions {
	forkExists?: boolean
	files?: Record<string, string>
	bunTestExitCode?: number
	bunTestStdout?: string
	bunTestStderr?: string
	execResults?: Record<string, ExecResult>
}

function makeLines(prefix: string, count: number): string {
	return Array.from({ length: count }, (_, i) => `${prefix}-${i}`).join("\n")
}

async function expectToThrow(promise: Promise<unknown>, expectedMessage: string): Promise<void> {
	let thrown: unknown = null

	try {
		await promise
	} catch (error) {
		thrown = error
	}

	expect(thrown).not.toBeNull()
	const message = thrown instanceof Error ? thrown.message : String(thrown)
	expect(message).toContain(expectedMessage)
}

function createMockDeps(options: MockOptions = {}) {
	const homeDir = "/mock/home"
	const forkPath = join(homeDir, FORK_RELATIVE_PATH)
	const files = { ...(options.files ?? {}) }
	const written: Record<string, string> = {}
	const dirs: string[] = []
	const execCalls: ExecCall[] = []
	const actions: SkillActionCall[] = []
	const existingPaths = new Set<string>()

	if (options.forkExists ?? true) {
		existingPaths.add(forkPath)
	}

	const deps: CoreModifierDependencies = {
		homeDir,
		existsSync: (path: string) => existingPaths.has(path),
		readFile: async (path: string) => {
			if (files[path] !== undefined) {
				return files[path]
			}
			throw new Error(`ENOENT: ${path}`)
		},
		writeFile: async (path: string, content: string) => {
			written[path] = content
			files[path] = content
		},
		mkdir: async (path: string) => {
			dirs.push(path)
		},
		exec: async (command: string, args: string[], execOptions?: { cwd?: string }) => {
			execCalls.push({ command, args, options: execOptions })
			const key = `${command} ${args.join(" ")}`

			if (options.execResults?.[key]) {
				return options.execResults[key]
			}

			if (command === "git" && args[0] === "clone") {
				existingPaths.add(args[2])
			}

			if (command === "bun" && args.join(" ") === "test") {
				return {
					exitCode: options.bunTestExitCode ?? 0,
					stdout: options.bunTestStdout ?? "tests completed",
					stderr: options.bunTestStderr ?? "",
				}
			}

			return { exitCode: 0, stdout: "ok", stderr: "" }
		},
		recordSkillAction: (skillName, action, diffSummary, success) => {
			actions.push({ skillName, action, diffSummary, success })
		},
	}

	return { deps, homeDir, forkPath, written, dirs, execCalls, actions }
}

describe("core-modifier", () => {
	describe("ensureFork", () => {
		it("returns existing fork path without cloning", async () => {
			const mock = createMockDeps({ forkExists: true })

			const result = await ensureFork(mock.deps)

			expect(result).toBe(mock.forkPath)
			expect(
				mock.execCalls.some(call => call.command === "git" && call.args[0] === "clone")
			).toBe(false)
			expect(mock.actions.some(action => action.action === "ensure-fork")).toBe(true)
		})

		it("clones fork when missing", async () => {
			const mock = createMockDeps({ forkExists: false })

			const result = await ensureFork(mock.deps)

			expect(result).toBe(mock.forkPath)
			expect(
				mock.execCalls.some(
					call =>
						call.command === "git" &&
						call.args[0] === "clone" &&
						call.args[1] === OH_MY_OPENCODE_REPO &&
						call.args[2] === mock.forkPath
				)
			).toBe(true)
		})
	})

	describe("createBranch", () => {
		it("creates arachne/{name} from latest main", async () => {
			const mock = createMockDeps()
			const branch = await createBranch("pipeline", mock.deps)

			expect(branch).toBe("arachne/pipeline")
			expect(mock.execCalls.slice(0, 4).map(call => call.args.join(" "))).toEqual([
				"fetch origin main",
				"checkout main",
				"pull --ff-only origin main",
				"checkout -B arachne/pipeline",
			])
			expect(mock.actions.some(action => action.action === "branch-created")).toBe(true)
		})
	})

	describe("applyModification", () => {
		it("writes allowed modifications and commits changes", async () => {
			const mock = createMockDeps({
				files: {
					[`${join("/mock/home", FORK_RELATIVE_PATH)}/src/hooks/use-core.ts`]:
						"export const useCore = () => 1",
				},
			})

			const result = await applyModification(
				"arachne/core-update",
				"src/hooks/use-core.ts",
				"export const useCore = () => 2",
				mock.deps
			)

			const expectedPath = `${mock.forkPath}/src/hooks/use-core.ts`
			expect(mock.written[expectedPath]).toBe("export const useCore = () => 2")
			expect(
				mock.execCalls.some(
					call => call.command === "git" && call.args.join(" ") === "add src/hooks/use-core.ts"
				)
			).toBe(true)
			expect(
				mock.execCalls.some(
					call =>
						call.command === "git" &&
						call.args[0] === "commit" &&
						call.args.includes("arachne(core): modify src/hooks/use-core.ts")
				)
			).toBe(true)
			expect(result.filePath).toBe("src/hooks/use-core.ts")
			expect(result.diffSummary).toContain("Updated src/hooks/use-core.ts")
		})

		it("rejects forbidden paths", async () => {
			const mock = createMockDeps()

			await expectToThrow(
				applyModification("arachne/core-update", "src/index.ts", "export const x = 1", mock.deps),
				"Blocked modification outside whitelist"
			)

			expect(Object.keys(mock.written)).toHaveLength(0)
			expect(
				mock.actions.some(action => action.action === "modified" && action.success === false)
			).toBe(true)
		})

		it("rejects oversized diffs", async () => {
			const path = `${join("/mock/home", FORK_RELATIVE_PATH)}/src/hooks/large.ts`
			const mock = createMockDeps({
				files: {
					[path]: makeLines("old", 60),
				},
			})

			await expectToThrow(
				applyModification("arachne/core-update", "src/hooks/large.ts", makeLines("new", 60), mock.deps),
				"exceeds"
			)

			expect(mock.written[path]).toBeUndefined()
		})
	})

	describe("runTests", () => {
		it("returns pass result when bun test exits with 0", async () => {
			const mock = createMockDeps({ bunTestExitCode: 0, bunTestStdout: "all green" })
			const result = await runTests(mock.deps)

			expect(result.passed).toBe(true)
			expect(result.exitCode).toBe(0)
			expect(result.output).toContain("all green")
		})

		it("returns failure result when bun test exits non-zero", async () => {
			const mock = createMockDeps({
				bunTestExitCode: 1,
				bunTestStdout: "1 failed",
				bunTestStderr: "stack trace",
			})
			const result = await runTests(mock.deps)

			expect(result.passed).toBe(false)
			expect(result.output).toContain("1 failed")
			expect(result.output).toContain("stack trace")
		})
	})

	describe("mergeBranch and rollback", () => {
		it("merges branch into main and deletes merged branch", async () => {
			const mock = createMockDeps()
			await mergeBranch("arachne/core-update", mock.deps)

			expect(mock.execCalls.map(call => call.args.join(" "))).toEqual([
				"checkout main",
				"merge --ff-only arachne/core-update",
				"branch -d arachne/core-update",
			])
			expect(mock.actions.some(action => action.action === "merged" && action.success === true)).toBe(
				true
			)
		})

		it("rolls back by deleting feature branch", async () => {
			const mock = createMockDeps()
			await rollback("arachne/core-update", mock.deps)

			expect(
				mock.execCalls.some(
					call => call.command === "git" && call.args.join(" ") === "branch -D arachne/core-update"
				)
			).toBe(true)
			expect(
				mock.actions.some(action => action.action === "rollback" && action.success === false)
			).toBe(true)
		})
	})

	describe("modifyCore", () => {
		it("runs full workflow and merges when tests pass", async () => {
			const filePath = `${join("/mock/home", FORK_RELATIVE_PATH)}/src/hooks/pipeline.ts`
			const mock = createMockDeps({
				files: {
					[filePath]: "export const pipeline = 1",
				},
				bunTestExitCode: 0,
			})

			const result = await modifyCore(
				"pipeline",
				"src/hooks/pipeline.ts",
				"export const pipeline = 2",
				mock.deps
			)

			expect(result.success).toBe(true)
			expect(result.branch).toBe("arachne/pipeline")
			expect(
				mock.execCalls.some(call => call.args.join(" ") === "merge --ff-only arachne/pipeline")
			).toBe(true)
			expect(
				mock.execCalls.some(call => call.args.join(" ") === "branch -D arachne/pipeline")
			).toBe(false)
		})

		it("rolls back and returns failure when tests fail", async () => {
			const filePath = `${join("/mock/home", FORK_RELATIVE_PATH)}/src/hooks/pipeline.ts`
			const mock = createMockDeps({
				files: {
					[filePath]: "export const pipeline = 1",
				},
				bunTestExitCode: 1,
			})

			const result = await modifyCore(
				"pipeline",
				"src/hooks/pipeline.ts",
				"export const pipeline = 2",
				mock.deps
			)

			expect(result.success).toBe(false)
			expect(result.testResult.passed).toBe(false)
			expect(
				mock.execCalls.some(call => call.args.join(" ") === "branch -D arachne/pipeline")
			).toBe(true)
		})

		it("rolls back and throws when modification step fails", async () => {
			const mock = createMockDeps()

			await expectToThrow(
				modifyCore("pipeline", "src/index.ts", "export const blocked = 1", mock.deps),
				"Blocked modification outside whitelist"
			)

			expect(
				mock.execCalls.some(call => call.args.join(" ") === "branch -D arachne/pipeline")
			).toBe(true)
		})
	})
})
