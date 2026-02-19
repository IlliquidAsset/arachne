import { describe, expect, test } from "bun:test"
import type { OpencodeClient } from "@opencode-ai/sdk"
import { DispatchTracker } from "./tracker"
import { createDispatch } from "./dispatch"
import type { DispatchDependencies } from "./dispatch"
import type { ArachneConfig } from "../config"
import type { DispatchRecord } from "./types"

const baseConfig: ArachneConfig = {
  discovery: {
    paths: [],
    ignore: ["node_modules", ".git", "dist", ".next", ".cache"],
  },
  servers: {
    portRange: [4100, 4200],
    autoStart: true,
  },
  auth: {
    apiKey: "",
    enabled: true,
  },
  dispatch: {
    maxConcurrent: 2,
    timeout: 300000,
  },
  voice: {
    enabled: false,
    port: 8090,
    whisper: {
      binaryPath: "whisper-server",
      modelPath: "~/.config/arachne/models/ggml-large-v3-turbo.bin",
      serverPort: 9000,
      language: "en",
      useCoreML: true,
    },
    tts: {
      engine: "kokoro",
      voiceId: "af_heart",
      sampleRate: 24000,
    },
    vad: {
      silenceThreshold: 640,
    },
    maxConcurrentSessions: 1,
  },
}

function makeSession(id: string, updated: number) {
  return {
    id,
    title: `Session ${id}`,
    version: "1",
    projectID: "proj-a",
    directory: "/tmp/project-a",
    time: { created: updated, updated },
  }
}

function makeDependencies(
  overrides: Partial<DispatchDependencies> = {},
): DispatchDependencies {
  const tracker = overrides.tracker ?? new DispatchTracker()
  const client = {} as OpencodeClient

  return {
    projects: {
      findByName: () => ({
        id: "project-a",
        name: "project-a",
        absolutePath: "/tmp/project-a",
        detectedFiles: ["package.json"],
        state: "discovered",
      }),
    },
    servers: {
      get: () => undefined,
    },
    clientPool: {
      getClient: () => client,
    },
    tracker,
    startServerFn: async (projectPath: string) => ({
      projectPath,
      pid: 123,
      port: 4105,
      url: "http://localhost:4105/",
      status: "running",
      lastHealthCheck: new Date(),
      consecutiveFailures: 0,
      startedAt: new Date(),
    }),
    listSessionsFn: async () => [makeSession("sess-1", 100), makeSession("sess-2", 200)],
    createSessionFn: async () => makeSession("sess-new", 300),
    sendMessageAsyncFn: async () => {},
    ...overrides,
  }
}

function makeActiveRecord(overrides: Partial<DispatchRecord> = {}): DispatchRecord {
  return {
    id: "active-dispatch",
    projectPath: "/tmp/project-a",
    projectName: "project-a",
    sessionId: "sess-active",
    message: "active",
    status: "sent",
    dispatchedAt: new Date(),
    ...overrides,
  }
}

describe("dispatch", () => {
  test("resolves project, auto-starts server, and sends async message", async () => {
    let startCalls = 0
    let sentSessionId = ""
    let sentText = ""

    const tracker = new DispatchTracker()
    const dispatch = createDispatch(
      makeDependencies({
        tracker,
        startServerFn: async (projectPath: string) => {
          startCalls += 1
          return {
            projectPath,
            pid: 999,
            port: 4190,
            url: "http://localhost:4190/",
            status: "running",
            lastHealthCheck: new Date(),
            consecutiveFailures: 0,
            startedAt: new Date(),
          }
        },
        sendMessageAsyncFn: async (_client, sessionId, input) => {
          sentSessionId = sessionId
          sentText = input.parts[0]?.text ?? ""
        },
      }),
    )

    const result = await dispatch("project-a", "ship it", undefined, baseConfig)

    expect(startCalls).toBe(1)
    expect(sentSessionId).toBe("sess-2")
    expect(sentText).toBe("ship it")
    expect(result.projectName).toBe("project-a")
    expect(result.sessionId).toBe("sess-2")
    expect(tracker.get(result.dispatchId)?.status).toBe("sent")
  })

  test("throws when max concurrent dispatches is reached", async () => {
    const tracker = new DispatchTracker()
    tracker.record(makeActiveRecord())

    let startCalled = false
    const dispatch = createDispatch(
      makeDependencies({
        tracker,
        startServerFn: async (projectPath: string) => {
          startCalled = true
          return {
            projectPath,
            pid: 555,
            port: 4101,
            url: "http://localhost:4101/",
            status: "running",
            lastHealthCheck: new Date(),
            consecutiveFailures: 0,
            startedAt: new Date(),
          }
        },
      }),
    )

    await expect(
      dispatch("project-a", "another task", undefined, {
        ...baseConfig,
        dispatch: {
          ...baseConfig.dispatch,
          maxConcurrent: 1,
        },
      }),
    ).rejects.toThrow("Max concurrent dispatches reached")

    expect(startCalled).toBe(false)
  })
})
