import { EventMonitor } from "./monitor"
import type { SSEEvent } from "./types"

declare const describe: (name: string, fn: () => void | Promise<void>) => void
declare const test: (name: string, fn: () => void | Promise<void>) => void
declare const expect: (value: unknown) => any

interface FakeTimerHandle {
  callback: () => void
  delayMs: number
  cleared: boolean
  unref: () => void
}

function createFakeTimers() {
  const timeouts: FakeTimerHandle[] = []
  const intervals: FakeTimerHandle[] = []

  return {
    timeouts,
    intervals,
    scheduleTimeout: (callback: () => void, delayMs: number) => {
      const handle: FakeTimerHandle = {
        callback,
        delayMs,
        cleared: false,
        unref: () => {},
      }
      timeouts.push(handle)
      return handle as unknown as ReturnType<typeof setTimeout>
    },
    clearScheduledTimeout: (timeout: ReturnType<typeof setTimeout>) => {
      ;(timeout as unknown as FakeTimerHandle).cleared = true
    },
    scheduleInterval: (callback: () => void, delayMs: number) => {
      const handle: FakeTimerHandle = {
        callback,
        delayMs,
        cleared: false,
        unref: () => {},
      }
      intervals.push(handle)
      return handle as unknown as ReturnType<typeof setInterval>
    },
    clearScheduledInterval: (interval: ReturnType<typeof setInterval>) => {
      ;(interval as unknown as FakeTimerHandle).cleared = true
    },
    runTimeout: (index: number) => {
      const handle = timeouts[index]
      if (!handle || handle.cleared) {
        return
      }

      handle.cleared = true
      handle.callback()
    },
  }
}

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe("EventMonitor", () => {
  test("parses SSE events with data lines, event/id fields, and empty delimiters", async () => {
    const timers = createFakeTimers()
    const received: Array<{ projectPath: string; event: SSEEvent }> = []

    const monitor = new EventMonitor({
      fetchFn: async () =>
        new Response(
          streamFromChunks([
            ":heartbeat\n\n",
            "data: {\"type\":\"project.updated\",\"properties\":{\"id\":\"skip\"}}\n\n",
            "data: {\"type\":\"session.status\",\n",
            "data: \"properties\":{\"sessionID\":\"sess-1\",\"status\":{\"type\":\"busy\"}}}\n\n",
            "id: evt-42\n",
            "event: message.part.updated\n",
            "data: {\"part\":{\"type\":\"text\",\"sessionID\":\"sess-1\",\"text\":\"Done\",\"time\":{\"end\":1}}}\n\n",
          ]),
          { status: 200 },
        ),
      scheduleTimeout: timers.scheduleTimeout,
      clearScheduledTimeout: timers.clearScheduledTimeout,
      scheduleInterval: timers.scheduleInterval,
      clearScheduledInterval: timers.clearScheduledInterval,
    })

    monitor.onEvent((projectPath, event) => {
      received.push({ projectPath, event })
    })

    monitor.subscribe("http://localhost:4100", "/tmp/project-a")
    await flush()

    expect(received).toHaveLength(2)
    expect(received[0]?.projectPath).toBe("/tmp/project-a")
    expect(received[0]?.event.type).toBe("session.status")
    expect(received[0]?.event.data).toEqual({
      sessionID: "sess-1",
      status: { type: "busy" },
    })
    expect(received[1]?.event.type).toBe("message.part.updated")
    expect(received[1]?.event.data).toEqual({
      part: {
        type: "text",
        sessionID: "sess-1",
        text: "Done",
        time: { end: 1 },
      },
    })

    monitor.unsubscribeAll()
  })

  test("reconnects with exponential backoff after disconnects", async () => {
    const timers = createFakeTimers()
    const encoder = new TextEncoder()
    let calls = 0

    const monitor = new EventMonitor({
      fetchFn: async (
        _input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) => {
        calls += 1

        if (calls < 4) {
          throw new Error("connection dropped")
        }

        let controllerRef: ReadableStreamDefaultController<Uint8Array> | null =
          null
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controllerRef = controller
            controller.enqueue(encoder.encode(":heartbeat\n\n"))
          },
        })

        const signal = init?.signal
        signal?.addEventListener(
          "abort",
          () => {
            controllerRef?.close()
          },
          { once: true },
        )

        return new Response(stream, { status: 200 })
      },
      scheduleTimeout: timers.scheduleTimeout,
      clearScheduledTimeout: timers.clearScheduledTimeout,
      scheduleInterval: timers.scheduleInterval,
      clearScheduledInterval: timers.clearScheduledInterval,
    })

    monitor.subscribe("http://localhost:4200", "/tmp/project-reconnect")
    await flush()

    expect(calls).toBe(1)
    expect(timers.timeouts.map((handle) => handle.delayMs)).toEqual([1000])

    timers.runTimeout(0)
    await flush()
    expect(calls).toBe(2)
    expect(timers.timeouts.map((handle) => handle.delayMs)).toEqual([
      1000,
      2000,
    ])

    timers.runTimeout(1)
    await flush()
    expect(calls).toBe(3)
    expect(timers.timeouts.map((handle) => handle.delayMs)).toEqual([
      1000,
      2000,
      4000,
    ])

    timers.runTimeout(2)
    await flush()
    expect(calls).toBe(4)

    monitor.unsubscribeAll()
  })

  test("unsubscribe stops connection and prevents reconnection", async () => {
    const timers = createFakeTimers()
    const encoder = new TextEncoder()
    let wasAborted = false
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null

    const monitor = new EventMonitor({
      fetchFn: async (
        _input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) => {
        const signal = init?.signal

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controllerRef = controller
            controller.enqueue(encoder.encode(":heartbeat\n\n"))
          },
        })

        signal?.addEventListener(
          "abort",
          () => {
            wasAborted = true
            controllerRef?.close()
          },
          { once: true },
        )

        return new Response(stream, { status: 200 })
      },
      scheduleTimeout: timers.scheduleTimeout,
      clearScheduledTimeout: timers.clearScheduledTimeout,
      scheduleInterval: timers.scheduleInterval,
      clearScheduledInterval: timers.clearScheduledInterval,
    })

    monitor.subscribe("http://localhost:4300", "/tmp/project-stop")
    await flush()

    expect(wasAborted).toBe(false)

    monitor.unsubscribe("/tmp/project-stop")
    await flush()

    expect(wasAborted).toBe(true)
    expect(timers.timeouts).toHaveLength(0)
  })
})
