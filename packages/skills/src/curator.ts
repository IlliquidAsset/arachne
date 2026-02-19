import { generateSkillContent } from "./generator"
import type {
	CreateSkillOptions,
	ModifySkillChanges,
	SkillHistoryEntry,
	SkillInfo,
	ValidationResult,
} from "./types"

export interface CuratorScanner {
	scan(): Promise<SkillInfo[]>
	getSkill(name: string): Promise<SkillInfo | null>
}

export interface CuratorValidator {
	validateSkill(
		skill: { name: string; frontmatter: { name: string; description: string }; content: string },
		existingNames?: string[]
	): ValidationResult
}

export interface CuratorDependencies {
	scanner: CuratorScanner
	validator: CuratorValidator
	writeFile: (path: string, content: string) => Promise<void>
	mkdir: (path: string) => Promise<void>
	rmdir: (path: string) => Promise<void>
	homeDir: string
}

export class SkillCurator {
	private deps: CuratorDependencies
	private history: SkillHistoryEntry[] = []

	constructor(deps: CuratorDependencies) {
		this.deps = deps
	}

	/** Creates a new skill as SKILL.md in user skills directory */
	async createSkill(
		name: string,
		description: string,
		content: string,
		opts?: CreateSkillOptions
	): Promise<SkillInfo> {
		// Validate before creating
		const existingSkills = await this.deps.scanner.scan()
		const existingNames = existingSkills.map(s => s.name)
		const frontmatter = {
			name,
			description,
			...(opts?.tools && opts.tools.length > 0 ? { tools: opts.tools } : {}),
			...(opts?.hooks && opts.hooks.length > 0 ? { hooks: opts.hooks } : {}),
			...(opts?.globs && opts.globs.length > 0 ? { globs: opts.globs } : {}),
		}

		const validation = this.deps.validator.validateSkill(
			{ name, frontmatter, content },
			existingNames
		)

		if (!validation.valid) {
			this.recordHistory(name, "created", `Validation failed: ${validation.errors.join(", ")}`, false)
			throw new Error(`Validation failed: ${validation.errors.join("; ")}`)
		}

		// Generate SKILL.md content
		const skillMd = generateSkillContent({
			name,
			description,
			tools: opts?.tools,
			hooks: opts?.hooks,
			globs: opts?.globs,
			content,
		})

		// Write to user scope: ~/.config/opencode/skills/arachne-{name}/SKILL.md
		const dirPath = `${this.deps.homeDir}/.config/opencode/skills/arachne-${name}`
		const filePath = `${dirPath}/SKILL.md`

		await this.deps.mkdir(dirPath)
		await this.deps.writeFile(filePath, skillMd)

		const skill: SkillInfo = {
			name,
			path: filePath,
			scope: "user",
			frontmatter,
			content,
		}

		this.recordHistory(name, "created", `Created skill "${name}"`, true)
		return skill
	}

	/** Modifies an existing skill — updates content and/or frontmatter */
	async modifySkill(name: string, changes: ModifySkillChanges): Promise<SkillInfo> {
		const existing = await this.deps.scanner.getSkill(name)
		if (!existing) {
			throw new Error(`Skill "${name}" not found`)
		}

		const diffParts: string[] = []

		// Merge frontmatter changes
		const newFrontmatter = { ...existing.frontmatter }
		if (changes.frontmatter) {
			for (const [key, value] of Object.entries(changes.frontmatter)) {
				if (value !== undefined) {
					const oldVal = (newFrontmatter as Record<string, unknown>)[key]
					;(newFrontmatter as Record<string, unknown>)[key] = value
					diffParts.push(`${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(value)}`)
				}
			}
		}

		// Update content
		const newContent = changes.content ?? existing.content
		if (changes.content && changes.content !== existing.content) {
			diffParts.push(`content updated (${existing.content.length} → ${changes.content.length} chars)`)
		}

		// Regenerate SKILL.md
		const skillMd = generateSkillContent({
			name: newFrontmatter.name,
			description: newFrontmatter.description,
			tools: newFrontmatter.tools,
			hooks: newFrontmatter.hooks,
			globs: newFrontmatter.globs,
			content: newContent,
		})

		await this.deps.writeFile(existing.path, skillMd)

		const updated: SkillInfo = {
			name,
			path: existing.path,
			scope: existing.scope,
			frontmatter: newFrontmatter,
			content: newContent,
		}

		this.recordHistory(
			name,
			"modified",
			diffParts.length > 0 ? diffParts.join("; ") : "No changes detected",
			true
		)
		return updated
	}

	/** Deletes a skill by removing its directory */
	async deleteSkill(name: string): Promise<void> {
		const existing = await this.deps.scanner.getSkill(name)
		if (!existing) {
			throw new Error(`Skill "${name}" not found`)
		}

		const dirPath = existing.path.replace(/\/SKILL\.md$/, "")
		await this.deps.rmdir(dirPath)

		this.recordHistory(name, "deleted", `Deleted skill "${name}"`, true)
	}

	/** Lists all discovered skills via scanner */
	async listSkills(): Promise<SkillInfo[]> {
		return this.deps.scanner.scan()
	}

	/** Returns the action history log */
	getSkillHistory(): SkillHistoryEntry[] {
		return [...this.history]
	}

	private recordHistory(
		skillName: string,
		action: SkillHistoryEntry["action"],
		diffSummary: string,
		success: boolean
	): void {
		this.history.push({
			skillName,
			action,
			timestamp: new Date(),
			diffSummary,
			success,
		})
	}
}
