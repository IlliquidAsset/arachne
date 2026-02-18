// @amanda/skills - skill curation engine

// Types
export type {
	SkillScope,
	SkillFrontmatter,
	SkillInfo,
	SkillAction,
	SkillHistoryEntry,
	ValidationResult,
	CreateSkillOptions,
	ModifySkillChanges,
} from "./types"

// Scanner
export { SkillScanner } from "./scanner"
export type { ScannerDependencies } from "./scanner"

// Generator
export { generateSkillContent } from "./generator"
export type { GenerateSkillOptions } from "./generator"

// Validator
export { validateSkill, validateFrontmatter } from "./validator"
export type { FrontmatterValidationResult } from "./validator"

// Curator
export { SkillCurator } from "./curator"
export type { CuratorDependencies, CuratorScanner, CuratorValidator } from "./curator"
