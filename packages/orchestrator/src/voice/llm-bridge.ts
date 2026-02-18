const DEFAULT_BASE_URL = "http://127.0.0.1:4100"
const DEFAULT_RESPONSE_TIMEOUT_MS = 60_000
const DEFAULT_POLL_INTERVAL_MS = 250
const VOICE_SESSION_TITLE = "Amanda Voice Session"

export interface LLMBridgeDependencies {
  promptAsync?: (
    sessionId: string,
    text: string,
    opts?: { agent?: string },
  ) => Promise<void>
  getResponse?: (sessionId: string) => Promise<string>
  createSession?: () => Promise<string>
}

export interface LLMBridgeOptions {
  baseUrl?: string
  apiKey?: string
  fetchFn?: typeof fetch
  responseTimeoutMs?: number
  pollIntervalMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function pickSessionId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null
  }

  const root = payload as Record<string, unknown>

  if (typeof root.id === "string" && root.id.length > 0) {
    return root.id
  }

  const data = root.data
  if (typeof data === "object" && data !== null) {
    const dataObj = data as Record<string, unknown>
    if (typeof dataObj.id === "string" && dataObj.id.length > 0) {
      return dataObj.id
    }
  }

  return null
}

function extractAssistantText(payload: unknown): string | null {
  let messages: unknown[] = []

  if (Array.isArray(payload)) {
    messages = payload
  } else if (typeof payload === "object" && payload !== null) {
    const root = payload as Record<string, unknown>
    if (Array.isArray(root.data)) {
      messages = root.data
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (typeof message !== "object" || message === null) {
      continue
    }

    const msg = message as Record<string, unknown>
    const info = msg.info
    if (typeof info !== "object" || info === null) {
      continue
    }

    const role = (info as Record<string, unknown>).role
    if (role !== "assistant") {
      continue
    }

    const parts = msg.parts
    if (!Array.isArray(parts)) {
      continue
    }

    const textParts: string[] = []
    for (const part of parts) {
      if (typeof part !== "object" || part === null) {
        continue
      }
      const typedPart = part as Record<string, unknown>
      if (typedPart.type === "text" && typeof typedPart.text === "string") {
        textParts.push(typedPart.text)
      }
    }

    if (textParts.length > 0) {
      return textParts.join("\n").trim()
    }
  }

  return null
}

export class LLMBridge {
  private readonly dependencies: LLMBridgeDependencies
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly fetchFn: typeof fetch
  private readonly responseTimeoutMs: number
  private readonly pollIntervalMs: number
  private sessionId: string | null = null

  constructor(
    dependencies: LLMBridgeDependencies = {},
    options: LLMBridgeOptions = {},
  ) {
    this.dependencies = dependencies
    this.baseUrl =
      options.baseUrl ?? process.env.OPENCODE_BASE_URL ?? DEFAULT_BASE_URL
    this.apiKey = options.apiKey ?? process.env.OPENCODE_API_KEY
    this.fetchFn = options.fetchFn ?? fetch
    this.responseTimeoutMs =
      options.responseTimeoutMs ?? DEFAULT_RESPONSE_TIMEOUT_MS
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  }

  async getOrCreateSession(): Promise<string> {
    if (this.sessionId) {
      return this.sessionId
    }

    const created = this.dependencies.createSession
      ? await this.dependencies.createSession()
      : await this.createSessionViaHttp()

    if (!created || created.trim().length === 0) {
      throw new Error("Failed to create voice session")
    }

    this.sessionId = created
    return created
  }

  async sendToLLM(
    text: string,
    opts?: { sessionId?: string },
  ): Promise<string> {
    const sessionId = opts?.sessionId ?? (await this.getOrCreateSession())

    if (this.dependencies.promptAsync) {
      await this.dependencies.promptAsync(sessionId, text)
    } else {
      await this.promptViaHttp(sessionId, text)
    }

    if (this.dependencies.getResponse) {
      return this.dependencies.getResponse(sessionId)
    }

    return this.getResponseViaHttp(sessionId)
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.apiKey && this.apiKey.length > 0) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    return headers
  }

  private async createSessionViaHttp(): Promise<string> {
    const response = await this.fetchFn(`${this.baseUrl}/session`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({ title: VOICE_SESSION_TITLE }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create session via HTTP: ${response.status}`)
    }

    const payload = await response.json()
    const sessionId = pickSessionId(payload)
    if (!sessionId) {
      throw new Error("Session creation response missing id")
    }

    return sessionId
  }

  private async promptViaHttp(sessionId: string, text: string): Promise<void> {
    const response = await this.fetchFn(
      `${this.baseUrl}/session/${encodeURIComponent(sessionId)}/prompt_async`,
      {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify({
          parts: [{ type: "text", text }],
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to queue prompt via HTTP: ${response.status}`)
    }
  }

  private async getResponseViaHttp(sessionId: string): Promise<string> {
    const start = Date.now()

    while (Date.now() - start < this.responseTimeoutMs) {
      let response: Response
      try {
        response = await this.fetchFn(
          `${this.baseUrl}/session/${encodeURIComponent(sessionId)}/message?limit=50`,
          {
            method: "GET",
            headers: this.buildHeaders(),
          },
        )
      } catch (error) {
        throw new Error(`Failed to read LLM response: ${toMessage(error)}`)
      }

      if (!response.ok) {
        throw new Error(`Failed to read LLM response via HTTP: ${response.status}`)
      }

      const payload = await response.json()
      const text = extractAssistantText(payload)
      if (text && text.length > 0) {
        return text
      }

      await sleep(this.pollIntervalMs)
    }

    throw new Error("Timed out waiting for LLM response")
  }
}
