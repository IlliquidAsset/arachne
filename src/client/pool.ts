import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import type { CachedClient } from "./types.js"

export class ClientPool {
  private cache = new Map<string, CachedClient>()

  getClient(
    projectPath: string,
    serverUrl: string,
    directory: string,
    password?: string,
  ): OpencodeClient {
    const existing = this.cache.get(projectPath)

    if (existing && existing.url === serverUrl) {
      return existing.client
    }

    if (existing) {
      this.cache.delete(projectPath)
    }

    const headers: Record<string, string> = {}
    if (password) {
      headers["authorization"] = `Bearer ${password}`
    }

    const client = createOpencodeClient({
      baseUrl: serverUrl,
      directory,
      headers,
    })

    this.cache.set(projectPath, { client, url: serverUrl })
    return client
  }

  invalidate(projectPath: string): void {
    this.cache.delete(projectPath)
  }

  invalidateAll(): void {
    this.cache.clear()
  }

  has(projectPath: string): boolean {
    return this.cache.has(projectPath)
  }

  get size(): number {
    return this.cache.size
  }
}

export const clientPool = new ClientPool()
