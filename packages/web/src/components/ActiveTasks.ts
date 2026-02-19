import type { TaskInfo } from "../api/types"

export type TaskFilter = "all" | "queued" | "running" | "completed" | "failed"

export interface TaskCardData {
	id: string
	name: string
	status: TaskInfo["status"]
	track: TaskInfo["track"]
	project: string
	duration: string
	statusIcon: string
}

export interface ActiveTasksData {
	tasks: TaskCardData[]
	totalCount: number
	runningCount: number
	filter: TaskFilter
}

export function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000)
	if (seconds < 60) return `${seconds}s`
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ${seconds % 60}s`
	const hours = Math.floor(minutes / 60)
	return `${hours}h ${minutes % 60}m`
}

export function getStatusIcon(status: TaskInfo["status"]): string {
	switch (status) {
		case "queued":
			return "clock"
		case "running":
			return "spinner"
		case "completed":
			return "check"
		case "failed":
			return "x"
	}
}

export function formatTaskCard(task: TaskInfo): TaskCardData {
	return {
		id: task.id,
		name: task.name,
		status: task.status,
		track: task.track,
		project: task.project,
		duration: formatDuration(task.duration),
		statusIcon: getStatusIcon(task.status),
	}
}

export function filterTasks(tasks: TaskInfo[], filter: TaskFilter): TaskInfo[] {
	if (filter === "all") return tasks
	return tasks.filter((t) => t.status === filter)
}

export function createActiveTasksData(
	tasks: TaskInfo[],
	filter: TaskFilter = "all",
): ActiveTasksData {
	const filtered = filterTasks(tasks, filter)

	return {
		tasks: filtered.map(formatTaskCard),
		totalCount: tasks.length,
		runningCount: tasks.filter((t) => t.status === "running").length,
		filter,
	}
}
