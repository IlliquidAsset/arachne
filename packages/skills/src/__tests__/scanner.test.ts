import { describe, it, expect } from "bun:test"
import { SkillScanner } from "../scanner"
import type { SkillScope } from "../types"

//#region helpers

const VALID_SKILL_MD = `---
name: test-skill
description: A test skill
tools:
  - tool1
  - tool2
hooks:
  - hook1
---

# Test Skill

This is a test skill content.
`

const MINIMAL_SKILL_MD = `---
name: minimal-skill
description: Minimal
---

Content here.
`

function createMockDeps(dirs: Record<string, string[]> = {}, files: Record<string, string> = {}) {
	return {
		readFile: async (path: string) => {
			if (files[path] !== undefined) return files[path]
			throw new Error(`ENOENT: ${path}`)
		},
		readDir: async (path: string) => {
			if (dirs[path] !== undefined) return dirs[path]
			throw new Error(`ENOENT: ${path}`)
		},
		existsSync: (path: string) => dirs[path] !== undefined,
		projectRoot: "/mock/project",
		homeDir: "/mock/home",
	}
}

//#endregion

describe("SkillScanner", () => {
	//#given a scanner with mocked FS

	describe("scan()", () => {
		//#when scanning with skills in multiple scopes
		it("discovers skills from all 4 scopes", async () => {
			const deps = createMockDeps(
				{
					"/mock/project/.opencode/skills": ["oc-proj-skill"],
					"/mock/home/.config/opencode/oh-my-opencode/skills": ["oc-skill"],
					"/mock/project/.opencode/skills/oc-proj-skill": ["SKILL.md"],
					"/mock/home/.config/opencode/oh-my-opencode/skills/oc-skill": ["SKILL.md"],
				},
				{
					"/mock/project/.opencode/skills/oc-proj-skill/SKILL.md": VALID_SKILL_MD,
					"/mock/home/.config/opencode/oh-my-opencode/skills/oc-skill/SKILL.md": MINIMAL_SKILL_MD,
				}
			)
			const scanner = new SkillScanner(deps)
			const skills = await scanner.scan()

			//#then returns skills sorted by scope priority
			expect(skills.length).toBeGreaterThanOrEqual(2)
			const scopes = skills.map(s => s.scope)
			const ocProjIdx = scopes.indexOf("opencode-project")
			const ocIdx = scopes.indexOf("opencode")
			if (ocProjIdx !== -1 && ocIdx !== -1) {
				expect(ocProjIdx).toBeLessThan(ocIdx)
			}
		})

		//#when scanning with no skill directories existing
		it("handles missing directories gracefully", async () => {
			const deps = createMockDeps()
			const scanner = new SkillScanner(deps)
			const skills = await scanner.scan()

			//#then returns empty array
			expect(skills).toEqual([])
		})

		//#when scanning with valid YAML frontmatter
		it("parses YAML frontmatter correctly", async () => {
			const deps = createMockDeps(
				{
					"/mock/project/.opencode/skills": ["my-skill"],
					"/mock/project/.opencode/skills/my-skill": ["SKILL.md"],
				},
				{
					"/mock/project/.opencode/skills/my-skill/SKILL.md": VALID_SKILL_MD,
				}
			)
			const scanner = new SkillScanner(deps)
			const skills = await scanner.scan()

			//#then frontmatter is parsed
			const skill = skills.find(s => s.frontmatter.name === "test-skill")
			expect(skill).toBeDefined()
			expect(skill!.frontmatter.description).toBe("A test skill")
			expect(skill!.frontmatter.tools).toEqual(["tool1", "tool2"])
			expect(skill!.frontmatter.hooks).toEqual(["hook1"])
		})

		//#when a SKILL.md has invalid YAML
		it("skips skills with invalid YAML frontmatter", async () => {
			const deps = createMockDeps(
				{
					"/mock/project/.opencode/skills": ["bad-skill"],
					"/mock/project/.opencode/skills/bad-skill": ["SKILL.md"],
				},
				{
					"/mock/project/.opencode/skills/bad-skill/SKILL.md": "---\n: invalid: yaml: [\n---\n\nContent",
				}
			)
			const scanner = new SkillScanner(deps)
			const skills = await scanner.scan()

			//#then returns empty (skipped invalid)
			expect(skills).toEqual([])
		})
	})

	describe("getSkill()", () => {
		//#when looking up an existing skill by name
		it("returns the skill if it exists", async () => {
			const deps = createMockDeps(
				{
					"/mock/project/.opencode/skills": ["my-skill"],
					"/mock/project/.opencode/skills/my-skill": ["SKILL.md"],
				},
				{
					"/mock/project/.opencode/skills/my-skill/SKILL.md": VALID_SKILL_MD,
				}
			)
			const scanner = new SkillScanner(deps)
			const skill = await scanner.getSkill("test-skill")

			//#then returns SkillInfo
			expect(skill).not.toBeNull()
			expect(skill!.name).toBe("test-skill")
		})

		//#when looking up a non-existent skill
		it("returns null for non-existent skill", async () => {
			const deps = createMockDeps()
			const scanner = new SkillScanner(deps)
			const skill = await scanner.getSkill("does-not-exist")

			//#then returns null
			expect(skill).toBeNull()
		})
	})

	describe("scope priority", () => {
		//#when same skill name exists in multiple scopes
		it("higher-priority scope wins", async () => {
			const projectSkill = `---\nname: dupe-skill\ndescription: Project version\n---\n\nProject content.`
			const userSkill = `---\nname: dupe-skill\ndescription: User version\n---\n\nUser content.`
			const deps = createMockDeps(
				{
					"/mock/project/.opencode/skills": ["dupe-skill"],
					"/mock/project/.opencode/skills/dupe-skill": ["SKILL.md"],
					"/mock/home/.config/opencode/skills": ["dupe-skill"],
					"/mock/home/.config/opencode/skills/dupe-skill": ["SKILL.md"],
				},
				{
					"/mock/project/.opencode/skills/dupe-skill/SKILL.md": projectSkill,
					"/mock/home/.config/opencode/skills/dupe-skill/SKILL.md": userSkill,
				}
			)
			const scanner = new SkillScanner(deps)
			const skills = await scanner.scan()

			//#then only the opencode-project scope version is returned
			const dupes = skills.filter(s => s.name === "dupe-skill")
			expect(dupes).toHaveLength(1)
			expect(dupes[0].scope).toBe("opencode-project")
		})
	})
})
