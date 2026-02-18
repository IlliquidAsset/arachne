import type {
  ProjectInfo,
  ProjectState,
  OnChangeCallback,
  ProjectChangeEvent,
} from "./types"

export class ProjectRegistry {
  private projects = new Map<string, ProjectInfo>()
  private listeners: OnChangeCallback[] = []

  register(project: ProjectInfo): void {
    const existing = this.projects.get(project.id)
    this.projects.set(project.id, project)

    if (!existing) {
      this.emit({ type: "added", project })
    }
  }

  unregister(id: string): void {
    const project = this.projects.get(id)
    if (project) {
      this.projects.delete(id)
      this.emit({ type: "removed", project })
    }
  }

  getAll(): ProjectInfo[] {
    return [...this.projects.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }

  getById(id: string): ProjectInfo | undefined {
    return this.projects.get(id)
  }

  getByPath(path: string): ProjectInfo | undefined {
    for (const project of this.projects.values()) {
      if (project.absolutePath === path) return project
    }
    return undefined
  }

  findByName(query: string): ProjectInfo | undefined {
    if (!query || query.length < 2) return undefined

    const all = [...this.projects.values()]
    const q = query.toLowerCase()

    const exact = all.find((p) => p.name === query || p.id === query)
    if (exact) return exact

    const caseInsensitive = all.find(
      (p) => p.name.toLowerCase() === q || p.id.toLowerCase() === q,
    )
    if (caseInsensitive) return caseInsensitive

    const startsWith = all.find(
      (p) =>
        p.name.toLowerCase().startsWith(q) ||
        p.id.toLowerCase().startsWith(q),
    )
    if (startsWith) return startsWith

    const contains = all.find(
      (p) =>
        p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    )
    if (contains) return contains

    return undefined
  }

  updateState(id: string, state: ProjectState): void {
    const project = this.projects.get(id)
    if (!project) return

    const previousState = project.state
    const updated = { ...project, state }
    this.projects.set(id, updated)

    this.emit({ type: "state-changed", project: updated, previousState })
  }

  onChange(callback: OnChangeCallback): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  clear(): void {
    this.projects.clear()
  }

  get size(): number {
    return this.projects.size
  }

  private emit(event: ProjectChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {}
    }
  }
}

export const projectRegistry = new ProjectRegistry()
