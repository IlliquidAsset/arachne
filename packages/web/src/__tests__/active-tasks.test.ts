import { describe, it, expect } from "bun:test"
import {
	formatDuration,
	getStatusIcon,
	formatTaskCard,
	filterTasks,
	createActiveTasksData,
} from "../components/ActiveTasks"
import type { TaskInfo } from "../api/types"

function makeTask(overrides?: Partial<TaskInfo>): TaskInfo {
	return {
		id: "task-1",
		name: "Build feature",
		status: "running",
		track: "llm",
		project: "arachne",
		startedAt: "2026-02-19T12:00:00Z",
		duration: 120_000,
		...overrides,
	}
}

describe("ActiveTasks", () => {
	describe("formatDuration", () => {
		it("formats seconds", () => expect(formatDuration(45_000)).toBe("45s"))
		it("formats minutes", () => expect(formatDuration(125_000)).toBe("2m 5s"))
		it("formats hours", () => expect(formatDuration(3_700_000)).toBe("1h 1m"))
	})

	describe("getStatusIcon", () => {
		it("returns correct icons", () => {
			expect(getStatusIcon("queued")).toBe("clock")
			expect(getStatusIcon("running")).toBe("spinner")
			expect(getStatusIcon("completed")).toBe("check")
			expect(getStatusIcon("failed")).toBe("x")
		})
	})

	describe("formatTaskCard", () => {
		it("formats task into card data", () => {
			const card = formatTaskCard(makeTask())
			expect(card.name).toBe("Build feature")
			expect(card.duration).toBe("2m 0s")
			expect(card.statusIcon).toBe("spinner")
		})
	})

	describe("filterTasks", () => {
		const tasks = [
			makeTask({ id: "1", status: "running" }),
			makeTask({ id: "2", status: "completed" }),
			makeTask({ id: "3", status: "failed" }),
			makeTask({ id: "4", status: "queued" }),
		]

		it("returns all tasks for 'all' filter", () => {
			expect(filterTasks(tasks, "all")).toHaveLength(4)
		})

		it("filters by status", () => {
			expect(filterTasks(tasks, "running")).toHaveLength(1)
			expect(filterTasks(tasks, "completed")).toHaveLength(1)
			expect(filterTasks(tasks, "failed")).toHaveLength(1)
		})
	})

	describe("createActiveTasksData", () => {
		it("creates data with filter", () => {
			const tasks = [
				makeTask({ id: "1", status: "running" }),
				makeTask({ id: "2", status: "completed" }),
			]

			const data = createActiveTasksData(tasks, "running")
			expect(data.tasks).toHaveLength(1)
			expect(data.totalCount).toBe(2)
			expect(data.runningCount).toBe(1)
			expect(data.filter).toBe("running")
		})

		it("handles empty tasks", () => {
			const data = createActiveTasksData([])
			expect(data.tasks).toHaveLength(0)
			expect(data.totalCount).toBe(0)
		})
	})
})
