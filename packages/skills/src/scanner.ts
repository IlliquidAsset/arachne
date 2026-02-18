import { parse as parseYaml } from "yaml"
import type { SkillFrontmatter, SkillInfo, SkillScope } from "./types"

/** Scope priority: opencode-project (highest) > opencode > project > user (lowest) */
const SCOPE_PRIORITY: Record<SkillScope, number> = {
	"opencode-project": 0,
	opencode: 1,
	project: 2,
	user: 3,
}

export interface ScannerDependencies {
	readFile: (path: string) => Promise<string>
	readDir: (path: string) => Promise<string[]>
	existsSync: (path: string) => boolean
	projectRoot: string
	homeDir: string
}

interface ScopeDir {
	scope: SkillScope
	path: string
}

/** Parses YAML frontmatter from a SKILL.md file, returns null on failure */
function parseFrontmatter(raw: string): { frontmatter: SkillFrontmatter; content: string } | null {
	const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
	if (!match) return null

	try {
		const parsed = parseYaml(match[1])
		if (!parsed || typeof parsed !== "object" || !parsed.name || !parsed.description) {
			return null
		}
		const frontmatter: SkillFrontmatter = {
			name: String(parsed.name),
			description: String(parsed.description),
			...(parsed.tools ? { tools: parsed.tools } : {}),
			...(parsed.hooks ? { hooks: parsed.hooks } : {}),
			...(parsed.globs ? { globs: parsed.globs } : {}),
		}
		return { frontmatter, content: match[2].trim() }
	} catch {
		return null
	}
}

export class SkillScanner {
	private deps: ScannerDependencies

	constructor(deps: ScannerDependencies) {
		this.deps = deps
	}

	/** Discovers all skills across the 4 OC scope directories, sorted by priority */
	async scan(): Promise<SkillInfo[]> {
		const scopeDirs = this.getScopeDirs()
		const allSkills: SkillInfo[] = []

		for (const { scope, path: dirPath } of scopeDirs) {
			if (!this.deps.existsSync(dirPath)) continue

			try {
				const entries = await this.deps.readDir(dirPath)
				for (const entry of entries) {
					const skillDir = `${dirPath}/${entry}`
					const skillPath = `${skillDir}/SKILL.md`

					try {
						const raw = await this.deps.readFile(skillPath)
						const parsed = parseFrontmatter(raw)
						if (!parsed) continue

						allSkills.push({
							name: parsed.frontmatter.name,
							path: skillPath,
							scope,
							frontmatter: parsed.frontmatter,
							content: parsed.content,
						})
					} catch {
						// Skip unreadable files
					}
				}
			} catch {
				// Skip unreadable directories
			}
		}

		// Deduplicate: higher-priority scope wins
		const seen = new Map<string, SkillInfo>()
		const sorted = allSkills.sort(
			(a, b) => SCOPE_PRIORITY[a.scope] - SCOPE_PRIORITY[b.scope]
		)
		for (const skill of sorted) {
			if (!seen.has(skill.name)) {
				seen.set(skill.name, skill)
			}
		}

		return Array.from(seen.values())
	}

	/** Finds a single skill by name across all scopes */
	async getSkill(name: string): Promise<SkillInfo | null> {
		const skills = await this.scan()
		return skills.find(s => s.name === name) ?? null
	}

	/** Returns the 4 scope directories in priority order */
	private getScopeDirs(): ScopeDir[] {
		const { projectRoot, homeDir } = this.deps
		return [
			{ scope: "opencode-project", path: `${projectRoot}/.opencode/skills` },
			{ scope: "opencode", path: `${homeDir}/.config/opencode/oh-my-opencode/skills` },
			{ scope: "project", path: `${projectRoot}/.opencode/skills` },
			{ scope: "user", path: `${homeDir}/.config/opencode/skills` },
		]
	}
}
