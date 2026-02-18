/** 4-scope priority system for OC skills (highest to lowest priority) */
export type SkillScope = "opencode-project" | "opencode" | "project" | "user"

/** YAML frontmatter fields for a SKILL.md file */
export interface SkillFrontmatter {
	name: string
	description: string
	tools?: string[]
	hooks?: string[]
	globs?: string[]
}

/** Full skill info including parsed content and scope */
export interface SkillInfo {
	name: string
	path: string
	scope: SkillScope
	frontmatter: SkillFrontmatter
	content: string
}

/** Actions tracked in skill history */
export type SkillAction = "created" | "modified" | "deleted"

/** History entry for a skill lifecycle event */
export interface SkillHistoryEntry {
	skillName: string
	action: SkillAction
	timestamp: Date
	diffSummary: string
	success: boolean
}

/** Result of skill validation */
export interface ValidationResult {
	valid: boolean
	errors: string[]
}

/** Options for creating a skill */
export interface CreateSkillOptions {
	tools?: string[]
	hooks?: string[]
	globs?: string[]
}

/** Options for modifying a skill */
export interface ModifySkillChanges {
	content?: string
	frontmatter?: Partial<SkillFrontmatter>
}
