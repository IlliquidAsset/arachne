import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { VoiceWebSocketServer } from "../websocket"
import type { ClientMessage, ServerMessage } from "../protocol"

const TEST_API_KEY = "test-secret-key-12345"

function getRandomPort(): number {
  return 49152 + Math.floor(Math.random() * 16000)
}

/** Wait for a WebSocket to reach the given readyState */
function waitForState(ws: WebSocket, state: number, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === state) return resolve()
    const timeout = setTimeout(() => reject(new Error(`WebSocket did not reach state ${state} within ${timeoutMs}ms`)), timeoutMs)
    const check = setInterval(() => {
      if (ws.readyState === state) {
        clearInterval(check)
        clearTimeout(timeout)
        resolve()
      }
    }, 10)
  })
}

/** Collect the next text message from a WebSocket */
function nextMessage(ws: WebSocket, timeoutMs = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("No message received within timeout")), timeoutMs)
    const handler = (event: MessageEvent) => {
      clearTimeout(timeout)
      ws.removeEventListener("message", handler)
      resolve(typeof event.data === "string" ? event.data : "")
    }
    ws.addEventListener("message", handler)
  })
}

/** Wait for WebSocket close event */
function waitForClose(ws: WebSocket, timeoutMs = 3000): Promise<CloseEvent> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("WebSocket did not close within timeout")), timeoutMs)
    const handler = (event: CloseEvent) => {
      clearTimeout(timeout)
      ws.removeEventListener("close", handler)
      resolve(event)
    }
    ws.addEventListener("close", handler)
  })
}

describe("VoiceWebSocketServer", () => {
  let server: VoiceWebSocketServer
  let port: number
  const openSockets: WebSocket[] = []

  function connect(token?: string): WebSocket {
    const url = token
      ? `ws://localhost:${port}/?token=${token}`
      : `ws://localhost:${port}/`
    const ws = new WebSocket(url)
    openSockets.push(ws)
    return ws
  }

  beforeEach(() => {
    port = getRandomPort()
    server = new VoiceWebSocketServer()
  })

  afterEach(async () => {
    // Close all client sockets
    for (const ws of openSockets) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
    openSockets.length = 0
    server.stop()
    // Brief delay for port release
    await new Promise((r) => setTimeout(r, 50))
  })

  test("starts on configured port and /health returns 200", async () => {
    server.start(port, 1, { getApiKey: () => TEST_API_KEY })

    const res = await fetch(`http://localhost:${port}/health`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("ok")
  })

  test("GET / returns HTML content", async () => {
    const html = "<html><body>Voice Client</body></html>"
    server.start(port, 1, {
      getApiKey: () => TEST_API_KEY,
      getClientHtml: () => html,
    })

    const res = await fetch(`http://localhost:${port}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    expect(await res.text()).toBe(html)
  })

  test("GET / returns placeholder HTML when getClientHtml not provided", async () => {
    server.start(port, 1, { getApiKey: () => TEST_API_KEY })

    const res = await fetch(`http://localhost:${port}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    const text = await res.text()
    expect(text).toContain("Voice Client")
  })

  test("WebSocket connection accepted with correct token", async () => {
    const connectCalls: unknown[] = []
    server.start(port, 1, {
      getApiKey: () => TEST_API_KEY,
      onConnect: (ws) => connectCalls.push(ws),
    })

    const ws = connect(TEST_API_KEY)
    await waitForState(ws, WebSocket.OPEN)

    expect(ws.readyState).toBe(WebSocket.OPEN)
    expect(server.getActiveSessions()).toBe(1)
    // Give onConnect a moment to fire
    await new Promise((r) => setTimeout(r, 50))
    expect(connectCalls.length).toBe(1)
  })

  test("WebSocket connection rejected without token", async () => {
    server.start(port, 1, { getApiKey: () => TEST_API_KEY })

    const ws = connect() // no token
    await waitForClose(ws)

    expect(ws.readyState).toBe(WebSocket.CLOSED)
    expect(server.getActiveSessions()).toBe(0)
  })

  test("WebSocket connection rejected with wrong token", async () => {
    server.start(port, 1, { getApiKey: () => TEST_API_KEY })

    const ws = connect("wrong-token")
    await waitForClose(ws)

    expect(ws.readyState).toBe(WebSocket.CLOSED)
    expect(server.getActiveSessions()).toBe(0)
  })

  test("second connection receives session_limit when at max sessions", async () => {
    server.start(port, 1, { getApiKey: () => TEST_API_KEY })

    // First connection succeeds
    const ws1 = connect(TEST_API_KEY)
    await waitForState(ws1, WebSocket.OPEN)
    expect(server.getActiveSessions()).toBe(1)

    // Second connection gets session_limit and closes
    const ws2 = connect(TEST_API_KEY)
    const msgPromise = nextMessage(ws2)
    const msg = await msgPromise
    const parsed = JSON.parse(msg) as ServerMessage
    expect(parsed.type).toBe("session_limit")

    // ws2 should close after session_limit
    await waitForClose(ws2)
    // Only first connection should remain
    expect(server.getActiveSessions()).toBe(1)
  })

  test("binary message triggers onAudioReceived callback", async () => {
    const audioChunks: Buffer[] = []
    server.start(port, 1, {
      getApiKey: () => TEST_API_KEY,
      onAudioReceived: (_ws, audio) => audioChunks.push(audio),
    })

    const ws = connect(TEST_API_KEY)
    await waitForState(ws, WebSocket.OPEN)

    const testAudio = new Uint8Array([1, 2, 3, 4, 5])
    ws.send(testAudio.buffer)

    // Wait for callback
    await new Promise((r) => setTimeout(r, 100))
    expect(audioChunks.length).toBe(1)
    expect(audioChunks[0].length).toBe(5)
    expect(audioChunks[0][0]).toBe(1)
    expect(audioChunks[0][4]).toBe(5)
  })

  test("text message parsed and triggers onClientMessage callback", async () => {
    const messages: ClientMessage[] = []
    server.start(port, 1, {
      getApiKey: () => TEST_API_KEY,
      onClientMessage: (_ws, msg) => messages.push(msg),
    })

    const ws = connect(TEST_API_KEY)
    await waitForState(ws, WebSocket.OPEN)

    ws.send(JSON.stringify({ type: "speech_start" }))
    await new Promise((r) => setTimeout(r, 100))

    expect(messages.length).toBe(1)
    expect(messages[0].type).toBe("speech_start")
  })

  test("invalid text message does not trigger onClientMessage", async () => {
    const messages: ClientMessage[] = []
    server.start(port, 1, {
      getApiKey: () => TEST_API_KEY,
      onClientMessage: (_ws, msg) => messages.push(msg),
    })

    const ws = connect(TEST_API_KEY)
    await waitForState(ws, WebSocket.OPEN)

    ws.send("not valid json {{{")
    await new Promise((r) => setTimeout(r, 100))

    expect(messages.length).toBe(0)
  })

  test("client disconnect triggers onDisconnect and decrements session count", async () => {
    const disconnectCalls: unknown[] = []
    server.start(port, 1, {
      getApiKey: () => TEST_API_KEY,
      onDisconnect: (ws) => disconnectCalls.push(ws),
    })

    const ws = connect(TEST_API_KEY)
    await waitForState(ws, WebSocket.OPEN)
    expect(server.getActiveSessions()).toBe(1)

    ws.close()
    await new Promise((r) => setTimeout(r, 100))

    expect(server.getActiveSessions()).toBe(0)
    expect(disconnectCalls.length).toBe(1)
  })

  test("sendTo delivers message to specific client", async () => {
    server.start(port, 2, { getApiKey: () => TEST_API_KEY })

    const ws = connect(TEST_API_KEY)
    await waitForState(ws, WebSocket.OPEN)

    // Get the server-side WebSocket reference via sessions
    const sessions = server.getSessions()
    const serverWs = [...sessions.keys()][0]

    const msgPromise = nextMessage(ws)
    server.sendTo(serverWs, { type: "transcription", text: "hello there" })

    const received = await msgPromise
    const parsed = JSON.parse(received)
    expect(parsed).toEqual({ type: "transcription", text: "hello there" })
  })

  test("broadcast delivers message to all connected clients", async () => {
    server.start(port, 3, { getApiKey: () => TEST_API_KEY })

    const ws1 = connect(TEST_API_KEY)
    const ws2 = connect(TEST_API_KEY)
    await waitForState(ws1, WebSocket.OPEN)
    await waitForState(ws2, WebSocket.OPEN)

    expect(server.getActiveSessions()).toBe(2)

    const msg1Promise = nextMessage(ws1)
    const msg2Promise = nextMessage(ws2)

    server.broadcast({ type: "listening" })

    const [msg1, msg2] = await Promise.all([msg1Promise, msg2Promise])
    expect(JSON.parse(msg1)).toEqual({ type: "listening" })
    expect(JSON.parse(msg2)).toEqual({ type: "listening" })
  })

  test("sendAudioTo delivers binary data to client", async () => {
    server.start(port, 1, { getApiKey: () => TEST_API_KEY })

    const ws = connect(TEST_API_KEY)
    await waitForState(ws, WebSocket.OPEN)

    const sessions = server.getSessions()
    const serverWs = [...sessions.keys()][0]

    const binaryPromise = new Promise<ArrayBuffer>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("No binary message")), 3000)
      ws.binaryType = "arraybuffer"
      ws.addEventListener("message", (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          clearTimeout(timeout)
          resolve(event.data)
        }
      })
    })

    const testAudio = new Float32Array([0.5, -0.5, 1.0, -1.0])
    server.sendAudioTo(serverWs, testAudio)

    const received = await binaryPromise
    const view = new Float32Array(received)
    expect(view.length).toBe(4)
    expect(view[0]).toBeCloseTo(0.5)
    expect(view[1]).toBeCloseTo(-0.5)
  })

  test("sendAudioTo delivers Buffer data to client", async () => {
    server.start(port, 1, { getApiKey: () => TEST_API_KEY })

    const ws = connect(TEST_API_KEY)
    await waitForState(ws, WebSocket.OPEN)

    const sessions = server.getSessions()
    const serverWs = [...sessions.keys()][0]

    const binaryPromise = new Promise<ArrayBuffer>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("No binary message")), 3000)
      ws.binaryType = "arraybuffer"
      ws.addEventListener("message", (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          clearTimeout(timeout)
          resolve(event.data)
        }
      })
    })

    const testBuffer = Buffer.from([10, 20, 30, 40])
    server.sendAudioTo(serverWs, testBuffer)

    const received = await binaryPromise
    const view = new Uint8Array(received)
    expect(view.length).toBe(4)
    expect(view[0]).toBe(10)
    expect(view[3]).toBe(40)
  })

  test("server stops cleanly", async () => {
    server.start(port, 1, { getApiKey: () => TEST_API_KEY })

    const res = await fetch(`http://localhost:${port}/health`)
    expect(res.status).toBe(200)

    server.stop()
    await new Promise((r) => setTimeout(r, 50))

    // Server should no longer respond
    try {
      await fetch(`http://localhost:${port}/health`)
      // If we get here, server is still responding — that's a failure
      expect(true).toBe(false)
    } catch {
      // Expected — connection refused after stop
      expect(true).toBe(true)
    }
  })

  test("getActiveSessions returns 0 initially", () => {
    server.start(port, 1, { getApiKey: () => TEST_API_KEY })
    expect(server.getActiveSessions()).toBe(0)
  })

  test("auth disabled when getApiKey not provided", async () => {
    server.start(port, 1, {})

    const ws = connect() // no token, no getApiKey
    await waitForState(ws, WebSocket.OPEN)

    expect(ws.readyState).toBe(WebSocket.OPEN)
    expect(server.getActiveSessions()).toBe(1)
  })
})
