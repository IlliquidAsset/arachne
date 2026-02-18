import { parse as parseYaml } from "yaml"
import type { SkillFrontmatter, ValidationResult } from "./types"

/** Name must be lowercase, alphanumeric + hyphens only */
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

interface ValidateSkillInput {
	name: string
	frontmatter: SkillFrontmatter
	content: string
}

/** Validates a skill before creation: name format, required fields, content, naming conflicts */
export function validateSkill(
	skill: ValidateSkillInput,
	existingNames: string[] = []
): ValidationResult {
	const errors: string[] = []

	// Name format check
	if (!NAME_PATTERN.test(skill.name)) {
		errors.push(
			`Invalid name "${skill.name}": must be lowercase alphanumeric with hyphens only`
		)
	}

	// Required frontmatter fields
	if (!skill.frontmatter.name || skill.frontmatter.name.trim() === "") {
		errors.push("Frontmatter name is required and must not be empty")
	}
	if (!skill.frontmatter.description || skill.frontmatter.description.trim() === "") {
		errors.push("Frontmatter description is required and must not be empty")
	}

	// Content not empty
	if (!skill.content || skill.content.trim() === "") {
		errors.push("Skill content must not be empty")
	}

	// Naming conflict
	if (existingNames.includes(skill.name)) {
		errors.push(
			`Skill name "${skill.name}" already exists — naming conflict`
		)
	}

	return { valid: errors.length === 0, errors }
}

export interface FrontmatterValidationResult {
	valid: boolean
	parsed?: SkillFrontmatter
	errors: string[]
}

/** Validates and parses a YAML frontmatter string */
export function validateFrontmatter(yaml: string): FrontmatterValidationResult {
	const errors: string[] = []

	let parsed: unknown
	try {
		parsed = parseYaml(yaml)
	} catch (e) {
		return {
			valid: false,
			errors: [`YAML parse error: ${e instanceof Error ? e.message : String(e)}`],
		}
	}

	if (!parsed || typeof parsed !== "object") {
		return { valid: false, errors: ["YAML must be an object"] }
	}

	const obj = parsed as Record<string, unknown>

	if (!obj.name || typeof obj.name !== "string") {
		errors.push("Missing required field: name")
	}
	if (!obj.description || typeof obj.description !== "string") {
		errors.push("Missing required field: description")
	}

	if (errors.length > 0) {
		return { valid: false, errors }
	}

	const frontmatter: SkillFrontmatter = {
		name: String(obj.name),
		description: String(obj.description),
		...(obj.tools && Array.isArray(obj.tools) ? { tools: obj.tools as string[] } : {}),
		...(obj.hooks && Array.isArray(obj.hooks) ? { hooks: obj.hooks as string[] } : {}),
		...(obj.globs && Array.isArray(obj.globs) ? { globs: obj.globs as string[] } : {}),
	}

	return { valid: true, parsed: frontmatter, errors: [] }
}
