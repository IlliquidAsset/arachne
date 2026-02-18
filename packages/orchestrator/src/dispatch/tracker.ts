import type { DispatchRecord } from "./types"

function isActive(record: DispatchRecord): boolean {
  return record.status === "pending" || record.status === "sent"
}

export class DispatchTracker {
  private readonly dispatches = new Map<string, DispatchRecord>()

  record(dispatch: DispatchRecord): void {
    this.dispatches.set(dispatch.id, dispatch)
  }

  get(id: string): DispatchRecord | undefined {
    return this.dispatches.get(id)
  }

  getActive(projectPath?: string): DispatchRecord[] {
    return [...this.dispatches.values()].filter((dispatch) => {
      if (!isActive(dispatch)) return false
      if (!projectPath) return true
      return dispatch.projectPath === projectPath
    })
  }

  getActiveCount(projectPath: string): number {
    return this.getActive(projectPath).length
  }

  markCompleted(id: string): void {
    const existing = this.dispatches.get(id)
    if (!existing) return

    this.dispatches.set(id, {
      ...existing,
      status: "completed",
      completedAt: new Date(),
      error: undefined,
    })
  }

  markFailed(id: string, error: string): void {
    const existing = this.dispatches.get(id)
    if (!existing) return

    this.dispatches.set(id, {
      ...existing,
      status: "failed",
      completedAt: new Date(),
      error,
    })
  }

  clear(): void {
    this.dispatches.clear()
  }
}

export const dispatchTracker = new DispatchTracker()
