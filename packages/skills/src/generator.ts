import { stringify as stringifyYaml } from "yaml"

export interface GenerateSkillOptions {
	name: string
	description: string
	tools?: string[]
	hooks?: string[]
	globs?: string[]
	content: string
}

/** Generates a valid SKILL.md string with YAML frontmatter and markdown content */
export function generateSkillContent(opts: GenerateSkillOptions): string {
	const frontmatter: Record<string, unknown> = {
		name: opts.name,
		description: opts.description,
	}

	if (opts.tools && opts.tools.length > 0) {
		frontmatter.tools = opts.tools
	}
	if (opts.hooks && opts.hooks.length > 0) {
		frontmatter.hooks = opts.hooks
	}
	if (opts.globs && opts.globs.length > 0) {
		frontmatter.globs = opts.globs
	}

	const yamlStr = stringifyYaml(frontmatter).trimEnd()
	return `---\n${yamlStr}\n---\n\n${opts.content}\n`
}
