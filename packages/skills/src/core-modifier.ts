import { dirname, join } from "node:path"
import { validateModification, checkForbiddenOperations } from "./diff-guard"
import { isModifiable } from "./core-whitelist"

export const OH_MY_OPENCODE_REPO = "https://github.com/code-yeongyu/oh-my-opencode.git"
export const FORK_RELATIVE_PATH = "Documents/dev/oh-my-opencode-arachne-fork"

export interface ExecResult {
	exitCode: number
	stdout?: string
	stderr?: string
}

export interface ExecOptions {
	cwd?: string
}

export interface CoreModifierDependencies {
	homeDir: string
	existsSync: (path: string) => boolean
	readFile: (path: string) => Promise<string>
	writeFile: (path: string, content: string) => Promise<void>
	mkdir: (path: string) => Promise<void>
	exec: (command: string, args: string[], options?: ExecOptions) => Promise<ExecResult>
	recordSkillAction: (
		skillName: string,
		action: string,
		diffSummary?: string | null,
		success?: boolean
	) => void
}

export interface CoreTestResult {
	passed: boolean
	exitCode: number
	output: string
}

export interface ApplyModificationResult {
	filePath: string
	diffSummary: string
	warnings: string[]
}

export interface ModifyCoreResult {
	success: boolean
	branch: string
	forkPath: string
	testResult: CoreTestResult
	diffSummary: string
	warnings: string[]
}

function getForkPath(deps: CoreModifierDependencies): string {
	return join(deps.homeDir, FORK_RELATIVE_PATH)
}

function getSkillNameFromBranch(branch: string): string {
	return branch.replace(/^arachne\//, "")
}

function formatExecOutput(result: ExecResult): string {
	return [result.stdout ?? "", result.stderr ?? ""].filter(Boolean).join("\n").trim()
}

async function runCommand(
	deps: CoreModifierDependencies,
	command: string,
	args: string[],
	options: ExecOptions,
	errorPrefix: string
): Promise<ExecResult> {
	const result = await deps.exec(command, args, options)
	if (result.exitCode !== 0) {
		const output = formatExecOutput(result)
		throw new Error(`${errorPrefix}: ${output || "command failed"}`)
	}

	return result
}

async function runGitCommand(
	deps: CoreModifierDependencies,
	args: string[],
	options: ExecOptions,
	errorPrefix: string
): Promise<ExecResult> {
	const guardResult = checkForbiddenOperations(args)
	if (!guardResult.ok) {
		throw new Error(guardResult.message)
	}

	return runCommand(deps, "git", args, options, errorPrefix)
}

async function readExistingContent(
	deps: CoreModifierDependencies,
	targetPath: string
): Promise<string> {
	try {
		return await deps.readFile(targetPath)
	} catch {
		return ""
	}
}

export async function ensureFork(deps: CoreModifierDependencies): Promise<string> {
	const forkPath = getForkPath(deps)

	if (deps.existsSync(forkPath)) {
		deps.recordSkillAction(
			"core-modifier",
			"ensure-fork",
			`Fork already exists at ${forkPath}`,
			true
		)
		return forkPath
	}

	await runGitCommand(
		deps,
		["clone", OH_MY_OPENCODE_REPO, forkPath],
		{},
		"Failed to clone oh-my-opencode fork"
	)

	deps.recordSkillAction(
		"core-modifier",
		"ensure-fork",
		`Created fork at ${forkPath}`,
		true
	)

	return forkPath
}

export async function createBranch(name: string, deps: CoreModifierDependencies): Promise<string> {
	const branch = `arachne/${name}`
	const forkPath = getForkPath(deps)

	await runGitCommand(deps, ["fetch", "origin", "main"], { cwd: forkPath }, "Failed to fetch main")
	await runGitCommand(deps, ["checkout", "main"], { cwd: forkPath }, "Failed to checkout main")
	await runGitCommand(
		deps,
		["pull", "--ff-only", "origin", "main"],
		{ cwd: forkPath },
		"Failed to update main"
	)
	await runGitCommand(
		deps,
		["checkout", "-B", branch],
		{ cwd: forkPath },
		`Failed to create branch ${branch}`
	)

	deps.recordSkillAction(name, "branch-created", `Created branch ${branch}`, true)
	return branch
}

export async function applyModification(
	branch: string,
	filePath: string,
	content: string,
	deps: CoreModifierDependencies
): Promise<ApplyModificationResult> {
	const forkPath = getForkPath(deps)
	const skillName = getSkillNameFromBranch(branch)

	if (!isModifiable(filePath)) {
		const summary = `Blocked modification outside whitelist: ${filePath}`
		deps.recordSkillAction(skillName, "modified", summary, false)
		throw new Error(summary)
	}

	await runGitCommand(
		deps,
		["checkout", branch],
		{ cwd: forkPath },
		`Failed to checkout branch ${branch}`
	)

	const safeFilePath = filePath.replace(/^\/+/, "")
	const targetPath = join(forkPath, safeFilePath)
	const parentDir = dirname(targetPath)

	try {
		await deps.mkdir(parentDir)
	} catch {
	}

	const oldContent = await readExistingContent(deps, targetPath)
	const validation = validateModification(filePath, oldContent, content)

	if (!validation.ok) {
		const summary = validation.errors.join(" | ")
		deps.recordSkillAction(skillName, "modified", summary, false)
		throw new Error(summary)
	}

	await deps.writeFile(targetPath, content)
	await runGitCommand(
		deps,
		["add", safeFilePath],
		{ cwd: forkPath },
		`Failed to stage ${safeFilePath}`
	)
	await runGitCommand(
		deps,
		["commit", "-m", `arachne(core): modify ${safeFilePath}`],
		{ cwd: forkPath },
		`Failed to commit ${safeFilePath}`
	)

	const warningText =
		validation.warnings.length > 0 ? ` (warnings: ${validation.warnings.join(" | ")})` : ""
	const diffSummary = `Updated ${safeFilePath} (${validation.linesChanged} lines changed)${warningText}`
	deps.recordSkillAction(skillName, "modified", diffSummary, true)

	return {
		filePath: safeFilePath,
		diffSummary,
		warnings: validation.warnings,
	}
}

export async function runTests(deps: CoreModifierDependencies): Promise<CoreTestResult> {
	const forkPath = getForkPath(deps)
	const result = await deps.exec("bun", ["test"], { cwd: forkPath })
	const output = formatExecOutput(result)
	const passed = result.exitCode === 0

	deps.recordSkillAction(
		"core-modifier",
		"tests",
		passed ? "bun test passed" : `bun test failed: ${output}`,
		passed
	)

	return {
		passed,
		exitCode: result.exitCode,
		output,
	}
}

export async function mergeBranch(branch: string, deps: CoreModifierDependencies): Promise<void> {
	const forkPath = getForkPath(deps)
	const skillName = getSkillNameFromBranch(branch)

	await runGitCommand(deps, ["checkout", "main"], { cwd: forkPath }, "Failed to checkout main")
	await runGitCommand(
		deps,
		["merge", "--ff-only", branch],
		{ cwd: forkPath },
		`Failed to merge ${branch}`
	)
	await runGitCommand(
		deps,
		["branch", "-d", branch],
		{ cwd: forkPath },
		`Failed to delete merged branch ${branch}`
	)

	deps.recordSkillAction(skillName, "merged", `Merged ${branch} into main`, true)
}

export async function rollback(branch: string, deps: CoreModifierDependencies): Promise<void> {
	const forkPath = getForkPath(deps)
	const skillName = getSkillNameFromBranch(branch)

	try {
		await runGitCommand(deps, ["checkout", "main"], { cwd: forkPath }, "Failed to checkout main")
	} catch {
	}

	try {
		await runGitCommand(
			deps,
			["branch", "-D", branch],
			{ cwd: forkPath },
			`Failed to delete branch ${branch}`
		)
		deps.recordSkillAction(skillName, "rollback", `Rolled back ${branch}`, false)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		deps.recordSkillAction(skillName, "rollback", `Rollback failed: ${message}`, false)
		throw error
	}
}

export async function modifyCore(
	name: string,
	filePath: string,
	newContent: string,
	deps: CoreModifierDependencies
): Promise<ModifyCoreResult> {
	const forkPath = await ensureFork(deps)
	const branch = await createBranch(name, deps)

	try {
		const modification = await applyModification(branch, filePath, newContent, deps)
		const testResult = await runTests(deps)

		if (!testResult.passed) {
			await rollback(branch, deps)
			const failureSummary = `Core modification failed tests for ${branch}`
			deps.recordSkillAction(name, "modified", failureSummary, false)

			return {
				success: false,
				branch,
				forkPath,
				testResult,
				diffSummary: modification.diffSummary,
				warnings: modification.warnings,
			}
		}

		await mergeBranch(branch, deps)
		deps.recordSkillAction(name, "modified", `Merged core update from ${branch}`, true)

		return {
			success: true,
			branch,
			forkPath,
			testResult,
			diffSummary: modification.diffSummary,
			warnings: modification.warnings,
		}
	} catch (error) {
		try {
			await rollback(branch, deps)
		} catch {
		}

		const message = error instanceof Error ? error.message : String(error)
		deps.recordSkillAction(name, "modified", `Core modification failed: ${message}`, false)
		throw error
	}
}
