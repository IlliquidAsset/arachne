export const MODIFIABLE_PATHS = [
	"src/hooks/**/*.ts",
	"src/features/**/*.ts",
	"src/skills/**/*.ts",
]

export const FORBIDDEN_PATHS = [
	"src/index.ts",
	"package.json",
	"*.test.ts",
	"node_modules/**",
]

function normalizePath(filePath: string): string {
	return filePath
		.replace(/\\/g, "/")
		.replace(/^\.\//, "")
		.replace(/^\/+/, "")
}

function getPathCandidates(filePath: string): string[] {
	const normalized = normalizePath(filePath)
	if (!normalized) return []

	const parts = normalized.split("/").filter(Boolean)
	const candidates = new Set<string>([normalized])

	for (let i = 1; i < parts.length; i += 1) {
		candidates.add(parts.slice(i).join("/"))
	}

	candidates.add(parts[parts.length - 1])
	return Array.from(candidates)
}

function matchesPattern(filePath: string, pattern: string): boolean {
	const glob = new Bun.Glob(pattern)
	const candidates = getPathCandidates(filePath)
	return candidates.some(candidate => glob.match(candidate))
}

function matchesAny(filePath: string, patterns: string[]): boolean {
	return patterns.some(pattern => matchesPattern(filePath, pattern))
}

export function isForbidden(filePath: string): boolean {
	return matchesAny(filePath, FORBIDDEN_PATHS)
}

export function isModifiable(filePath: string): boolean {
	return matchesAny(filePath, MODIFIABLE_PATHS) && !isForbidden(filePath)
}
