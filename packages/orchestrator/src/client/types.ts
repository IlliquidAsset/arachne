import type { OpencodeClient } from "@opencode-ai/sdk"

export interface ClientConfig {
  baseUrl: string
  directory: string
  password?: string
}

export interface CachedClient {
  client: OpencodeClient
  // Tracked for cache invalidation when server restarts on a different port
  url: string
}

export interface SessionInfo {
  id: string
  title: string
  version: string
  projectID: string
  directory: string
  parentID?: string
  time: {
    created: number
    updated: number
    compacting?: number
  }
}

export interface PromptInput {
  parts: Array<{
    type: "text"
    text: string
  }>
  model?: {
    providerID: string
    modelID: string
  }
  agent?: string
  system?: string
}

export interface PromptResult {
  info: Record<string, unknown>
  parts: Array<Record<string, unknown>>
}

export interface MessageWithParts {
  info: Record<string, unknown>
  parts: Array<Record<string, unknown>>
}
