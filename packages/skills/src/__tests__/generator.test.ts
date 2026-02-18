import { describe, it, expect } from "bun:test"
import { generateSkillContent } from "../generator"
import { parse as parseYaml } from "yaml"

describe("generateSkillContent", () => {
	//#given valid skill options

	//#when generating with all fields
	it("generates valid SKILL.md with full YAML frontmatter", () => {
		const result = generateSkillContent({
			name: "my-cool-skill",
			description: "Does cool things",
			tools: ["tool1", "tool2"],
			hooks: ["hook1"],
			content: "This is the skill instruction content.",
		})

		//#then output has YAML frontmatter delimited by ---
		expect(result).toMatch(/^---\n/)
		expect(result).toMatch(/\n---\n/)

		// Parse frontmatter
		const fmMatch = result.match(/^---\n([\s\S]*?)\n---/)
		expect(fmMatch).not.toBeNull()
		const fm = parseYaml(fmMatch![1])
		expect(fm.name).toBe("my-cool-skill")
		expect(fm.description).toBe("Does cool things")
		expect(fm.tools).toEqual(["tool1", "tool2"])
		expect(fm.hooks).toEqual(["hook1"])

		//#then content follows frontmatter
		expect(result).toContain("This is the skill instruction content.")
	})

	//#when generating with minimal fields (name + description only)
	it("generates SKILL.md with only required frontmatter fields", () => {
		const result = generateSkillContent({
			name: "minimal-skill",
			description: "Minimal description",
			content: "Some content.",
		})

		//#then frontmatter has name and description
		const fmMatch = result.match(/^---\n([\s\S]*?)\n---/)
		expect(fmMatch).not.toBeNull()
		const fm = parseYaml(fmMatch![1])
		expect(fm.name).toBe("minimal-skill")
		expect(fm.description).toBe("Minimal description")

		//#then optional fields are not present
		expect(fm.tools).toBeUndefined()
		expect(fm.hooks).toBeUndefined()

		//#then content is included
		expect(result).toContain("Some content.")
	})

	//#when generating with empty tools/hooks arrays
	it("omits empty arrays from frontmatter", () => {
		const result = generateSkillContent({
			name: "no-extras",
			description: "No extras",
			tools: [],
			hooks: [],
			content: "Body.",
		})

		const fmMatch = result.match(/^---\n([\s\S]*?)\n---/)
		const fm = parseYaml(fmMatch![1])
		//#then empty arrays are omitted
		expect(fm.tools).toBeUndefined()
		expect(fm.hooks).toBeUndefined()
	})

	//#when content has markdown headers
	it("preserves markdown formatting in content", () => {
		const result = generateSkillContent({
			name: "markdown-skill",
			description: "Has markdown",
			content: "## Section\n\n- bullet 1\n- bullet 2",
		})

		//#then markdown is preserved
		expect(result).toContain("## Section")
		expect(result).toContain("- bullet 1")
	})
})
