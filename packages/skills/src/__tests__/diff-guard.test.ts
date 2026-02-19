import { describe, it, expect } from "bun:test"
import {
	MAX_LINES_CHANGED,
	checkDiffSize,
	checkForbiddenOperations,
	checkExportPreservation,
	validateModification,
} from "../diff-guard"

function makeLines(prefix: string, count: number): string {
	return Array.from({ length: count }, (_, i) => `${prefix}-${i}`).join("\n")
}

describe("diff-guard", () => {
	describe("checkDiffSize", () => {
		it("returns zero for identical content", () => {
			const result = checkDiffSize("export const a = 1", "export const a = 1")
			expect(result.ok).toBe(true)
			expect(result.linesChanged).toBe(0)
		})

		it("counts small line changes within limit", () => {
			const oldContent = "line1\nline2\nline3"
			const newContent = "line1\nline2-updated\nline3"
			const result = checkDiffSize(oldContent, newContent)

			expect(result.ok).toBe(true)
			expect(result.linesChanged).toBe(2)
		})

		it("fails when changed lines exceed MAX_LINES_CHANGED", () => {
			const oldContent = makeLines("old", 60)
			const newContent = makeLines("new", 60)
			const result = checkDiffSize(oldContent, newContent)

			expect(result.ok).toBe(false)
			expect(result.linesChanged).toBeGreaterThan(MAX_LINES_CHANGED)
			expect(result.message).toContain("exceeds")
		})
	})

	describe("checkForbiddenOperations", () => {
		it("allows normal git operations", () => {
			const result = checkForbiddenOperations(["checkout", "main"])
			expect(result.ok).toBe(true)
		})

		it("blocks --force", () => {
			const result = checkForbiddenOperations(["push", "origin", "main", "--force"])
			expect(result.ok).toBe(false)
			expect(result.message).toContain("--force")
		})

		it("blocks --force-with-lease", () => {
			const result = checkForbiddenOperations([
				"push",
				"origin",
				"main",
				"--force-with-lease",
			])
			expect(result.ok).toBe(false)
			expect(result.message).toContain("--force-with-lease")
		})

		it("blocks string command containing force push", () => {
			const result = checkForbiddenOperations("git push --force origin main")
			expect(result.ok).toBe(false)
		})
	})

	describe("checkExportPreservation", () => {
		it("passes when existing exports are preserved", () => {
			const oldContent = "export const useCore = () => 1"
			const newContent = "export const useCore = () => 2\nexport const next = 3"
			const result = checkExportPreservation(oldContent, newContent)

			expect(result.ok).toBe(true)
			expect(result.removedExports).toEqual([])
		})

		it("warns when a named export is removed", () => {
			const oldContent = "export const alpha = 1\nexport const beta = 2"
			const newContent = "export const alpha = 1"
			const result = checkExportPreservation(oldContent, newContent)

			expect(result.ok).toBe(false)
			expect(result.removedExports).toEqual(["beta"])
		})

		it("warns when default export is removed", () => {
			const oldContent = "const value = 1\nexport default value"
			const newContent = "export const value = 1"
			const result = checkExportPreservation(oldContent, newContent)

			expect(result.ok).toBe(false)
			expect(result.removedExports).toContain("default")
		})

		it("tracks aliased named exports", () => {
			const oldContent = "const source = 1\nexport { source as stableApi }"
			const newContent = "export const source = 1"
			const result = checkExportPreservation(oldContent, newContent)

			expect(result.ok).toBe(false)
			expect(result.removedExports).toContain("stableApi")
		})
	})

	describe("validateModification", () => {
		it("passes safe modifications", () => {
			const result = validateModification(
				"src/hooks/use-core.ts",
				"export const value = 1",
				"export const value = 2"
			)

			expect(result.ok).toBe(true)
			expect(result.errors).toEqual([])
			expect(result.linesChanged).toBeGreaterThan(0)
		})

		it("fails when diff size is too large", () => {
			const result = validateModification(
				"src/hooks/large-change.ts",
				makeLines("a", 70),
				makeLines("b", 70)
			)

			expect(result.ok).toBe(false)
			expect(result.errors.some(error => error.includes("exceeds"))).toBe(true)
		})

		it("fails when forbidden git args are provided", () => {
			const result = validateModification(
				"src/hooks/use-core.ts",
				"export const value = 1",
				"export const value = 1",
				["push", "origin", "main", "--force"]
			)

			expect(result.ok).toBe(false)
			expect(result.errors.some(error => error.includes("--force"))).toBe(true)
		})

		it("returns warnings when exports are removed", () => {
			const result = validateModification(
				"src/hooks/export-change.ts",
				"export const stable = 1\nexport const removed = 2",
				"export const stable = 1"
			)

			expect(result.ok).toBe(true)
			expect(result.warnings.length).toBe(1)
			expect(result.warnings[0]).toContain("removed exports")
		})
	})
})
