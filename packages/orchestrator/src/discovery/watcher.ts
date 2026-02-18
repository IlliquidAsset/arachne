import { scanProjects } from "./scanner"
import type { ProjectInfo } from "./types"

export type WatcherChangeEvent =
  | { type: "added"; projects: ProjectInfo[] }
  | { type: "removed"; projects: ProjectInfo[] }

export type WatcherCallback = (event: WatcherChangeEvent) => void

export function startWatching(
  basePath: string,
  intervalMs: number,
  onChange: WatcherCallback,
  ignore?: string[],
): () => void {
  let knownIds = new Set<string>()
  let knownMap = new Map<string, ProjectInfo>()
  let stopped = false

  async function poll() {
    if (stopped) return

    try {
      const current = await scanProjects(basePath, ignore)
      const currentIds = new Set(current.map((p) => p.id))
      const currentMap = new Map(current.map((p) => [p.id, p]))

      const added = current.filter((p) => !knownIds.has(p.id))
      const removed = [...knownMap.values()].filter(
        (p) => !currentIds.has(p.id),
      )

      if (added.length > 0) {
        onChange({ type: "added", projects: added })
      }
      if (removed.length > 0) {
        onChange({ type: "removed", projects: removed })
      }

      knownIds = currentIds
      knownMap = currentMap
    } catch {}
  }

  poll()
  const timer = setInterval(poll, intervalMs)

  return () => {
    stopped = true
    clearInterval(timer)
  }
}
