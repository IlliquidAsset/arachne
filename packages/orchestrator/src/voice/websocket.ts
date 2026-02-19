/**
 * Voice WebSocket server for bidirectional audio transport.
 *
 * Uses Bun.serve() with both HTTP fetch and WebSocket handlers.
 * Handles auth via ?token= query param, enforces session limits,
 * and delegates audio/message handling to injected dependencies.
 *
 * This module handles TRANSPORT ONLY — no pipeline logic,
 * no encoding/decoding, no reconnection.
 */

import type { Server, ServerWebSocket } from "bun"
import type { ClientMessage, ServerMessage } from "./protocol"
import { parseClientMessage, serializeServerMessage } from "./protocol"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionData {
  connectedAt: Date
  state: "connected" | "active" | "session_limit"
}

export interface WebSocketDependencies {
  onAudioReceived?: (ws: ServerWebSocket<SessionData>, audio: Buffer) => void
  onClientMessage?: (ws: ServerWebSocket<SessionData>, msg: ClientMessage) => void
  onConnect?: (ws: ServerWebSocket<SessionData>) => void
  onDisconnect?: (ws: ServerWebSocket<SessionData>) => void
  getApiKey?: () => string
  getClientHtml?: () => string
}

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html>
<head><title>Arachne Voice</title></head>
<body><h1>Voice Client</h1><p>Voice client UI will be served here.</p></body>
</html>`

// ---------------------------------------------------------------------------
// VoiceWebSocketServer
// ---------------------------------------------------------------------------

export class VoiceWebSocketServer {
  private server: Server<SessionData> | null = null
  private sessions = new Map<ServerWebSocket<SessionData>, SessionData>()
  private maxSessions = 1
  private deps: WebSocketDependencies = {}

  /**
   * Start the WebSocket server on the given port.
   */
  start(port: number, maxSessions: number, deps: WebSocketDependencies): void {
    this.maxSessions = maxSessions
    this.deps = deps
    this.sessions.clear()

    const self = this

    this.server = Bun.serve<SessionData>({
      port,
      fetch(req, server) {
        const url = new URL(req.url)

        // Health check
        if (url.pathname === "/health") {
          return new Response("ok", { status: 200 })
        }

        // Serve client HTML
        if (url.pathname === "/" && req.method === "GET") {
          // Check if this is a WebSocket upgrade request
          if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
            return self.handleUpgrade(req, server, url)
          }

          const html = deps.getClientHtml?.() ?? PLACEHOLDER_HTML
          return new Response(html, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        }

        // WebSocket upgrade on any other path
        if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
          return self.handleUpgrade(req, server, url)
        }

        return new Response("Not Found", { status: 404 })
      },
      websocket: {
        open(ws) {
          self.handleOpen(ws)
        },
        message(ws, msg) {
          self.handleMessage(ws, msg)
        },
        close(ws) {
          self.handleClose(ws)
        },
      },
    })
  }

  /**
   * Stop the server and clear all sessions.
   */
  stop(): void {
    if (this.server) {
      this.server.stop(true)
      this.server = null
    }
    this.sessions.clear()
  }

  /**
   * Get the number of currently connected clients.
   */
  getActiveSessions(): number {
    return this.sessions.size
  }

  /**
   * Get the internal sessions map (for advanced use / testing).
   */
  getSessions(): Map<ServerWebSocket<SessionData>, SessionData> {
    return this.sessions
  }

  /**
   * Broadcast a message to all connected clients.
   */
  broadcast(msg: ServerMessage): void {
    const data = serializeServerMessage(msg)
    for (const ws of this.sessions.keys()) {
      ws.send(data)
    }
  }

  /**
   * Send a text message to a specific client.
   */
  sendTo(ws: ServerWebSocket<SessionData>, msg: ServerMessage): void {
    ws.send(serializeServerMessage(msg))
  }

  /**
   * Send binary audio data to a specific client.
   */
  sendAudioTo(ws: ServerWebSocket<SessionData>, audio: Float32Array | Buffer): void {
    if (audio instanceof Float32Array) {
      ws.send(new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength))
    } else {
      ws.send(audio)
    }
  }

  // -------------------------------------------------------------------------
  // Private handlers
  // -------------------------------------------------------------------------

  private handleUpgrade(req: Request, server: Server<SessionData>, url: URL): Response | undefined {
    const apiKey = this.deps.getApiKey?.()

    // If getApiKey is provided and returns a key, enforce auth
    if (apiKey) {
      const token = url.searchParams.get("token")
      if (!token || token !== apiKey) {
        return new Response("Unauthorized", { status: 401 })
      }
    }

    // Check session limit — we still upgrade but will send session_limit and close in open handler
    const atLimit = this.sessions.size >= this.maxSessions

    const upgraded = server.upgrade(req, {
      data: {
        connectedAt: new Date(),
        state: atLimit ? "session_limit" : "connected",
      },
    })

    if (!upgraded) {
      return new Response("WebSocket upgrade failed", { status: 500 })
    }

    // Bun returns undefined on successful upgrade
    return undefined
  }

  private handleOpen(ws: ServerWebSocket<SessionData>): void {
    // Check if this connection should be rejected due to session limit
    if (ws.data.state === "session_limit") {
      ws.send(serializeServerMessage({ type: "session_limit" }))
      ws.close(1008, "Session limit reached")
      return
    }

    // Add to active sessions
    const sessionData: SessionData = {
      connectedAt: ws.data.connectedAt,
      state: "connected",
    }
    this.sessions.set(ws, sessionData)
    this.deps.onConnect?.(ws)
  }

  private handleMessage(ws: ServerWebSocket<SessionData>, msg: string | Buffer | ArrayBuffer | Uint8Array): void {
    if (typeof msg === "string") {
      // Text frame — parse as ClientMessage
      const parsed = parseClientMessage(msg)
      if (parsed) {
        this.deps.onClientMessage?.(ws, parsed)
      }
    } else {
      // Binary frame — audio data
      let buffer: Buffer
      if (msg instanceof ArrayBuffer) {
        buffer = Buffer.from(new Uint8Array(msg))
      } else if (msg instanceof Buffer) {
        buffer = msg
      } else {
        buffer = Buffer.from(msg as Uint8Array)
      }
      this.deps.onAudioReceived?.(ws, buffer)
    }
  }

  private handleClose(ws: ServerWebSocket<SessionData>): void {
    if (this.sessions.has(ws)) {
      this.sessions.delete(ws)
      this.deps.onDisconnect?.(ws)
    }
  }
}
