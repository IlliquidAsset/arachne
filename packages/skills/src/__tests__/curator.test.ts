import { describe, it, expect, beforeEach } from "bun:test"
import { SkillCurator } from "../curator"
import type { SkillInfo, SkillHistoryEntry, SkillScope } from "../types"

//#region mock setup

const VALID_SKILL_MD = `---
name: existing-skill
description: An existing skill
---

# Existing Skill

Existing content.
`

function createMockScanner(skills: SkillInfo[] = []) {
	return {
		scan: async () => skills,
		getSkill: async (name: string) => skills.find(s => s.name === name) ?? null,
	}
}

function createMockValidator(valid = true, errors: string[] = []) {
	return {
		validateSkill: () => ({ valid, errors }),
		validateFrontmatter: () => ({ valid, errors, parsed: undefined }),
	}
}

function createMockFS() {
	const written: Record<string, string> = {}
	const dirs: string[] = []
	const removed: string[] = []
	return {
		writeFile: async (path: string, content: string) => {
			written[path] = content
		},
		mkdir: async (path: string) => {
			dirs.push(path)
		},
		rmdir: async (path: string) => {
			removed.push(path)
		},
		written,
		dirs,
		removed,
	}
}

//#endregion

describe("SkillCurator", () => {
	//#given a curator with mocked dependencies

	describe("createSkill()", () => {
		//#when creating a valid skill
		it("creates SKILL.md in user skills directory", async () => {
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner(),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			const skill = await curator.createSkill(
				"my-new-skill",
				"A brand new skill",
				"Skill instruction content.",
				{ tools: ["tool1"] }
			)

			//#then returns SkillInfo
			expect(skill.name).toBe("my-new-skill")
			expect(skill.scope).toBe("user")
			expect(skill.frontmatter.description).toBe("A brand new skill")
			expect(skill.frontmatter.tools).toEqual(["tool1"])

			//#then writes to correct path
			const expectedDir = "/mock/home/.config/opencode/skills/amanda-my-new-skill"
			expect(fs.dirs).toContain(expectedDir)
			const writtenPath = `${expectedDir}/SKILL.md`
			expect(fs.written[writtenPath]).toBeDefined()
			expect(fs.written[writtenPath]).toContain("my-new-skill")
		})

		//#when validation fails
		it("throws on validation failure", async () => {
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner(),
				validator: createMockValidator(false, ["Name is invalid"]),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			//#then throws with validation errors
			await expect(
				curator.createSkill("Bad Name!", "Desc", "Content")
			).rejects.toThrow("Validation failed")
		})

		//#when creating a skill, history is recorded
		it("records creation in history", async () => {
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner(),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			await curator.createSkill("hist-skill", "A skill", "Content")
			const history = curator.getSkillHistory()

			//#then history has one entry
			expect(history).toHaveLength(1)
			expect(history[0].skillName).toBe("hist-skill")
			expect(history[0].action).toBe("created")
			expect(history[0].success).toBe(true)
		})
	})

	describe("modifySkill()", () => {
		//#when modifying an existing skill
		it("reads existing skill and applies content changes", async () => {
			const existingSkill: SkillInfo = {
				name: "existing-skill",
				path: "/mock/home/.config/opencode/skills/amanda-existing-skill/SKILL.md",
				scope: "user",
				frontmatter: { name: "existing-skill", description: "An existing skill" },
				content: "Old content.",
			}
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner([existingSkill]),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			const updated = await curator.modifySkill("existing-skill", {
				content: "New content.",
			})

			//#then updated skill has new content
			expect(updated.content).toBe("New content.")
			expect(fs.written[existingSkill.path]).toBeDefined()
		})

		//#when modifying frontmatter fields
		it("merges frontmatter changes", async () => {
			const existingSkill: SkillInfo = {
				name: "existing-skill",
				path: "/mock/home/.config/opencode/skills/amanda-existing-skill/SKILL.md",
				scope: "user",
				frontmatter: { name: "existing-skill", description: "Old desc" },
				content: "Content.",
			}
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner([existingSkill]),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			const updated = await curator.modifySkill("existing-skill", {
				frontmatter: { description: "New desc", tools: ["new-tool"] },
			})

			//#then frontmatter is merged
			expect(updated.frontmatter.description).toBe("New desc")
			expect(updated.frontmatter.tools).toEqual(["new-tool"])
		})

		//#when modifying non-existent skill
		it("throws for non-existent skill", async () => {
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner(),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			await expect(
				curator.modifySkill("ghost", { content: "New" })
			).rejects.toThrow("not found")
		})

		//#when modifying, history records diff summary
		it("records modification in history with diff summary", async () => {
			const existingSkill: SkillInfo = {
				name: "mod-skill",
				path: "/mock/path/SKILL.md",
				scope: "user",
				frontmatter: { name: "mod-skill", description: "Desc" },
				content: "Old.",
			}
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner([existingSkill]),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			await curator.modifySkill("mod-skill", { content: "New." })
			const history = curator.getSkillHistory()

			expect(history).toHaveLength(1)
			expect(history[0].action).toBe("modified")
			expect(history[0].diffSummary).toBeTruthy()
		})
	})

	describe("deleteSkill()", () => {
		//#when deleting an existing skill
		it("removes skill directory", async () => {
			const existingSkill: SkillInfo = {
				name: "doomed-skill",
				path: "/mock/home/.config/opencode/skills/amanda-doomed-skill/SKILL.md",
				scope: "user",
				frontmatter: { name: "doomed-skill", description: "Going away" },
				content: "Goodbye.",
			}
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner([existingSkill]),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			await curator.deleteSkill("doomed-skill")

			//#then directory is removed
			expect(fs.removed.length).toBeGreaterThan(0)
			expect(fs.removed[0]).toContain("amanda-doomed-skill")
		})

		//#when deleting non-existent skill
		it("throws for non-existent skill", async () => {
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner(),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			await expect(curator.deleteSkill("ghost")).rejects.toThrow("not found")
		})

		//#when deleting, history is recorded
		it("records deletion in history", async () => {
			const existingSkill: SkillInfo = {
				name: "bye-skill",
				path: "/mock/path/SKILL.md",
				scope: "user",
				frontmatter: { name: "bye-skill", description: "Bye" },
				content: "Content.",
			}
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner([existingSkill]),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			await curator.deleteSkill("bye-skill")
			const history = curator.getSkillHistory()

			expect(history).toHaveLength(1)
			expect(history[0].action).toBe("deleted")
			expect(history[0].success).toBe(true)
		})
	})

	describe("listSkills()", () => {
		//#when listing skills
		it("delegates to scanner", async () => {
			const skills: SkillInfo[] = [
				{
					name: "skill-a",
					path: "/a/SKILL.md",
					scope: "opencode-project",
					frontmatter: { name: "skill-a", description: "A" },
					content: "A",
				},
			]
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner(skills),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			const result = await curator.listSkills()

			//#then returns scanner results
			expect(result).toEqual(skills)
		})
	})

	describe("getSkillHistory()", () => {
		//#when no actions have been performed
		it("returns empty history", () => {
			const fs = createMockFS()
			const curator = new SkillCurator({
				scanner: createMockScanner(),
				validator: createMockValidator(),
				writeFile: fs.writeFile,
				mkdir: fs.mkdir,
				rmdir: fs.rmdir,
				homeDir: "/mock/home",
			})

			expect(curator.getSkillHistory()).toEqual([])
		})
	})
})
