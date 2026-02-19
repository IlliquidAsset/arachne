export const MAX_LINES_CHANGED = 50

export interface DiffSizeResult {
	ok: boolean
	linesChanged: number
	message: string
}

export interface ForbiddenOperationResult {
	ok: boolean
	message: string
}

export interface ExportPreservationResult {
	ok: boolean
	removedExports: string[]
	message: string
}

export interface ModificationValidationResult {
	ok: boolean
	filePath: string
	linesChanged: number
	errors: string[]
	warnings: string[]
	message: string
}

function splitLines(content: string): string[] {
	if (!content) return []

	const lines = content.replace(/\r\n/g, "\n").split("\n")
	if (lines.length > 0 && lines[lines.length - 1] === "") {
		lines.pop()
	}

	return lines
}

function countChangedLines(oldContent: string, newContent: string): number {
	if (oldContent === newContent) return 0

	const oldLines = splitLines(oldContent)
	const newLines = splitLines(newContent)

	if (oldLines.length === 0) return newLines.length
	if (newLines.length === 0) return oldLines.length

	let previousRow = new Array<number>(newLines.length + 1).fill(0)

	for (let i = 1; i <= oldLines.length; i += 1) {
		const currentRow = new Array<number>(newLines.length + 1).fill(0)

		for (let j = 1; j <= newLines.length; j += 1) {
			if (oldLines[i - 1] === newLines[j - 1]) {
				currentRow[j] = previousRow[j - 1] + 1
			} else {
				currentRow[j] = Math.max(previousRow[j], currentRow[j - 1])
			}
		}

		previousRow = currentRow
	}

	const lcsLength = previousRow[newLines.length]
	return oldLines.length + newLines.length - lcsLength * 2
}

function tokenizeGitArgs(gitArgs: string | string[]): string[] {
	if (Array.isArray(gitArgs)) {
		return gitArgs.map(arg => arg.trim().toLowerCase()).filter(Boolean)
	}

	return gitArgs
		.split(/\s+/)
		.map(arg => arg.trim().toLowerCase())
		.filter(Boolean)
}

function collectExports(content: string): Set<string> {
	const exported = new Set<string>()

	for (const match of content.matchAll(
		/^\s*export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm
	)) {
		exported.add(match[1])
	}

	for (const match of content.matchAll(
		/^\s*export\s*{\s*([^}]+)\s*}(?:\s*from\s*["'][^"']+["'])?\s*;?/gm
	)) {
		const entries = match[1].split(",")
		for (const entry of entries) {
			const cleaned = entry.trim().replace(/^type\s+/, "")
			if (!cleaned) continue

			const aliasMatch = cleaned.match(/\bas\s+([A-Za-z_$][A-Za-z0-9_$]*)$/)
			if (aliasMatch) {
				exported.add(aliasMatch[1])
				continue
			}

			const nameMatch = cleaned.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/)
			if (nameMatch) {
				exported.add(nameMatch[1])
			}
		}
	}

	if (/^\s*export\s+default\b/m.test(content)) {
		exported.add("default")
	}

	if (/^\s*export\s+\*\s+from\s+["'][^"']+["']\s*;?/gm.test(content)) {
		exported.add("*")
	}

	return exported
}

export function checkDiffSize(oldContent: string, newContent: string): DiffSizeResult {
	const linesChanged = countChangedLines(oldContent, newContent)
	const ok = linesChanged <= MAX_LINES_CHANGED

	return {
		ok,
		linesChanged,
		message: ok
			? `Diff size is within limit (${linesChanged}/${MAX_LINES_CHANGED} lines)`
			: `Diff size exceeds limit (${linesChanged}/${MAX_LINES_CHANGED} lines)`,
	}
}

export function checkForbiddenOperations(gitArgs: string | string[]): ForbiddenOperationResult {
	const args = tokenizeGitArgs(gitArgs)
	const command = args.join(" ")

	if (args.includes("--force-with-lease") || command.includes("push --force-with-lease")) {
		return {
			ok: false,
			message: "Forbidden git operation detected: --force-with-lease is not allowed",
		}
	}

	if (args.includes("--force") || command.includes("push --force")) {
		return {
			ok: false,
			message: "Forbidden git operation detected: --force is not allowed",
		}
	}

	return {
		ok: true,
		message: "No forbidden git operations detected",
	}
}

export function checkExportPreservation(
	oldContent: string,
	newContent: string
): ExportPreservationResult {
	const previousExports = collectExports(oldContent)
	const nextExports = collectExports(newContent)

	const removedExports = Array.from(previousExports).filter(name => !nextExports.has(name))

	if (removedExports.length === 0) {
		return {
			ok: true,
			removedExports: [],
			message: "No exported symbols removed",
		}
	}

	return {
		ok: false,
		removedExports,
		message: `Export preservation warning: removed exports ${removedExports.join(", ")}`,
	}
}

export function validateModification(
	filePath: string,
	oldContent: string,
	newContent: string,
	gitArgs: string | string[] = []
): ModificationValidationResult {
	const errors: string[] = []
	const warnings: string[] = []

	const diffResult = checkDiffSize(oldContent, newContent)
	if (!diffResult.ok) {
		errors.push(diffResult.message)
	}

	const operationResult = checkForbiddenOperations(gitArgs)
	if (!operationResult.ok) {
		errors.push(operationResult.message)
	}

	const exportResult = checkExportPreservation(oldContent, newContent)
	if (!exportResult.ok) {
		warnings.push(exportResult.message)
	}

	const ok = errors.length === 0
	const warningSuffix = warnings.length > 0 ? ` Warnings: ${warnings.join(" | ")}` : ""

	return {
		ok,
		filePath,
		linesChanged: diffResult.linesChanged,
		errors,
		warnings,
		message: ok
			? `Modification validated for ${filePath}.${warningSuffix}`.trim()
			: `Modification blocked for ${filePath}: ${errors.join(" | ")}`,
	}
}
