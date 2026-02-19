// @arachne/skills - skill curation engine

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

export { MODIFIABLE_PATHS, FORBIDDEN_PATHS, isModifiable, isForbidden } from "./core-whitelist"

export {
	MAX_LINES_CHANGED,
	checkDiffSize,
	checkForbiddenOperations,
	checkExportPreservation,
	validateModification,
} from "./diff-guard"
export type {
	DiffSizeResult,
	ForbiddenOperationResult,
	ExportPreservationResult,
	ModificationValidationResult,
} from "./diff-guard"

export {
	OH_MY_OPENCODE_REPO,
	FORK_RELATIVE_PATH,
	ensureFork,
	createBranch,
	applyModification,
	runTests,
	mergeBranch,
	rollback,
	modifyCore,
} from "./core-modifier"
export type {
	ExecResult,
	ExecOptions,
	CoreModifierDependencies,
	CoreTestResult,
	ApplyModificationResult,
	ModifyCoreResult,
} from "./core-modifier"
