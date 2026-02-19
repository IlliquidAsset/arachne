import { describe, it, expect } from "bun:test"
import {
	MODIFIABLE_PATHS,
	FORBIDDEN_PATHS,
	isModifiable,
	isForbidden,
} from "../core-whitelist"

describe("core-whitelist", () => {
	it("exposes expected modifiable patterns", () => {
		expect(MODIFIABLE_PATHS).toEqual([
			"src/hooks/**/*.ts",
			"src/features/**/*.ts",
			"src/skills/**/*.ts",
		])
	})

	it("exposes expected forbidden patterns", () => {
		expect(FORBIDDEN_PATHS).toEqual([
			"src/index.ts",
			"package.json",
			"*.test.ts",
			"node_modules/**",
		])
	})

	it("allows hook files under src/hooks", () => {
		expect(isModifiable("src/hooks/guard.ts")).toBe(true)
		expect(isForbidden("src/hooks/guard.ts")).toBe(false)
	})

	it("allows nested feature files", () => {
		expect(isModifiable("src/features/flows/core/runner.ts")).toBe(true)
	})

	it("allows skill files and handles absolute paths", () => {
		expect(
			isModifiable("/tmp/repo/oh-my-opencode/src/skills/modify-core.ts")
		).toBe(true)
	})

	it("blocks src/index.ts even though it is under src", () => {
		expect(isForbidden("src/index.ts")).toBe(true)
		expect(isModifiable("src/index.ts")).toBe(false)
	})

	it("blocks package.json modifications", () => {
		expect(isForbidden("/tmp/repo/package.json")).toBe(true)
		expect(isModifiable("/tmp/repo/package.json")).toBe(false)
	})

	it("blocks test files regardless of directory", () => {
		expect(isForbidden("src/hooks/use-core.test.ts")).toBe(true)
		expect(isForbidden("src/features/flow/guard.test.ts")).toBe(true)
		expect(isModifiable("src/hooks/use-core.test.ts")).toBe(false)
	})

	it("blocks files under node_modules", () => {
		expect(isForbidden("/tmp/repo/node_modules/pkg/index.ts")).toBe(true)
		expect(isModifiable("/tmp/repo/node_modules/pkg/index.ts")).toBe(false)
	})

	it("returns false for paths outside modifiable scopes", () => {
		expect(isForbidden("src/utils/format.ts")).toBe(false)
		expect(isModifiable("src/utils/format.ts")).toBe(false)
	})

	it("normalizes Windows style paths", () => {
		expect(isModifiable("C:\\repo\\src\\hooks\\windows-path.ts")).toBe(true)
	})
})
