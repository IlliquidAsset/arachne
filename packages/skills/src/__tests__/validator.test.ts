import { describe, it, expect } from "bun:test"
import { validateSkill, validateFrontmatter } from "../validator"

describe("validateSkill", () => {
	//#given a valid skill

	it("passes for a valid skill", () => {
		const result = validateSkill({
			name: "my-skill",
			frontmatter: { name: "my-skill", description: "A good skill" },
			content: "Some content here",
		})

		//#then valid is true with no errors
		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})

	//#when name is invalid
	it("fails for name with uppercase", () => {
		const result = validateSkill({
			name: "MySkill",
			frontmatter: { name: "MySkill", description: "Bad name" },
			content: "Content",
		})

		//#then returns name format error
		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.includes("name"))).toBe(true)
	})

	it("fails for name with spaces", () => {
		const result = validateSkill({
			name: "my skill",
			frontmatter: { name: "my skill", description: "Bad name" },
			content: "Content",
		})

		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.includes("name"))).toBe(true)
	})

	it("fails for name with special characters", () => {
		const result = validateSkill({
			name: "my_skill!",
			frontmatter: { name: "my_skill!", description: "Bad name" },
			content: "Content",
		})

		expect(result.valid).toBe(false)
	})

	//#when required frontmatter fields are missing
	it("fails for missing description", () => {
		const result = validateSkill({
			name: "good-name",
			frontmatter: { name: "good-name", description: "" },
			content: "Content",
		})

		//#then returns missing description error
		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.includes("description"))).toBe(true)
	})

	it("fails for missing name in frontmatter", () => {
		const result = validateSkill({
			name: "good-name",
			frontmatter: { name: "", description: "Desc" },
			content: "Content",
		})

		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.includes("name"))).toBe(true)
	})

	//#when content is empty
	it("fails for empty content", () => {
		const result = validateSkill({
			name: "good-name",
			frontmatter: { name: "good-name", description: "Desc" },
			content: "",
		})

		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.includes("content"))).toBe(true)
	})

	it("fails for whitespace-only content", () => {
		const result = validateSkill({
			name: "good-name",
			frontmatter: { name: "good-name", description: "Desc" },
			content: "   \n\t  ",
		})

		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.includes("content"))).toBe(true)
	})

	//#when name conflicts with existing skills
	it("fails for naming conflict", () => {
		const result = validateSkill(
			{
				name: "existing-skill",
				frontmatter: { name: "existing-skill", description: "Desc" },
				content: "Content",
			},
			["existing-skill", "other-skill"]
		)

		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.includes("conflict") || e.includes("exists"))).toBe(true)
	})

	it("passes when name does not conflict", () => {
		const result = validateSkill(
			{
				name: "new-skill",
				frontmatter: { name: "new-skill", description: "Desc" },
				content: "Content",
			},
			["existing-skill"]
		)

		expect(result.valid).toBe(true)
	})

	//#when multiple errors exist
	it("collects all errors at once", () => {
		const result = validateSkill({
			name: "Bad Name!",
			frontmatter: { name: "", description: "" },
			content: "",
		})

		expect(result.valid).toBe(false)
		expect(result.errors.length).toBeGreaterThanOrEqual(3)
	})
})

describe("validateFrontmatter", () => {
	//#given valid YAML frontmatter string
	it("parses valid YAML", () => {
		const result = validateFrontmatter("name: test\ndescription: A test")

		expect(result.valid).toBe(true)
		expect(result.parsed).toBeDefined()
		expect(result.parsed!.name).toBe("test")
		expect(result.parsed!.description).toBe("A test")
	})

	//#when YAML is invalid syntax
	it("fails for invalid YAML", () => {
		const result = validateFrontmatter(": invalid: yaml: [")

		expect(result.valid).toBe(false)
		expect(result.errors.length).toBeGreaterThan(0)
	})

	//#when YAML is missing required fields
	it("fails for missing required fields", () => {
		const result = validateFrontmatter("foo: bar")

		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.includes("name"))).toBe(true)
	})

	//#when YAML has correct structure with optional fields
	it("parses optional fields", () => {
		const result = validateFrontmatter(
			"name: test\ndescription: A test\ntools:\n  - tool1\nglobs:\n  - '*.ts'"
		)

		expect(result.valid).toBe(true)
		expect(result.parsed!.tools).toEqual(["tool1"])
		expect(result.parsed!.globs).toEqual(["*.ts"])
	})
})
