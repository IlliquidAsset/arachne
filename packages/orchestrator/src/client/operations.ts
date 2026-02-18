import type { OpencodeClient } from "@opencode-ai/sdk"
import type { SessionInfo, PromptInput, PromptResult, MessageWithParts } from "./types.js"

function toSessionInfo(s: {
  id: string
  title: string
  version: string
  projectID: string
  directory: string
  parentID?: string
  time: { created: number; updated: number; compacting?: number }
}): SessionInfo {
  return {
    id: s.id,
    title: s.title,
    version: s.version,
    projectID: s.projectID,
    directory: s.directory,
    parentID: s.parentID,
    time: {
      created: s.time.created,
      updated: s.time.updated,
      compacting: s.time.compacting,
    },
  }
}

export async function listSessions(client: OpencodeClient): Promise<SessionInfo[]> {
  const result = await client.session.list()
  if (result.error) {
    throw new Error(`Failed to list sessions: ${JSON.stringify(result.error)}`)
  }
  return (result.data ?? []).map(toSessionInfo)
}

export async function createSession(
  client: OpencodeClient,
  title?: string,
): Promise<SessionInfo> {
  const result = await client.session.create({ body: { title } })
  if (result.error) {
    throw new Error(`Failed to create session: ${JSON.stringify(result.error)}`)
  }
  return toSessionInfo(result.data!)
}

export async function getSession(
  client: OpencodeClient,
  sessionId: string,
): Promise<SessionInfo> {
  const result = await client.session.get({ path: { id: sessionId } })
  if (result.error) {
    throw new Error(`Failed to get session: ${JSON.stringify(result.error)}`)
  }
  return toSessionInfo(result.data!)
}

export async function sendMessage(
  client: OpencodeClient,
  sessionId: string,
  input: PromptInput,
): Promise<PromptResult> {
  const result = await client.session.prompt({
    path: { id: sessionId },
    body: {
      parts: input.parts,
      model: input.model,
      agent: input.agent,
      system: input.system,
    },
  })
  if (result.error) {
    throw new Error(`Failed to send message: ${JSON.stringify(result.error)}`)
  }
  return result.data as unknown as PromptResult
}

export async function sendMessageAsync(
  client: OpencodeClient,
  sessionId: string,
  input: PromptInput,
): Promise<void> {
  const result = await client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: input.parts,
      model: input.model,
      agent: input.agent,
      system: input.system,
    },
  })
  if (result.error) {
    throw new Error(`Failed to send async message: ${JSON.stringify(result.error)}`)
  }
}

export async function abortSession(
  client: OpencodeClient,
  sessionId: string,
): Promise<void> {
  const result = await client.session.abort({ path: { id: sessionId } })
  if (result.error) {
    throw new Error(`Failed to abort session: ${JSON.stringify(result.error)}`)
  }
}

export async function getMessages(
  client: OpencodeClient,
  sessionId: string,
  limit?: number,
): Promise<MessageWithParts[]> {
  const result = await client.session.messages({
    path: { id: sessionId },
    query: limit !== undefined ? { limit } : undefined,
  })
  if (result.error) {
    throw new Error(`Failed to get messages: ${JSON.stringify(result.error)}`)
  }
  return (result.data ?? []) as unknown as MessageWithParts[]
}

export async function deleteSession(
  client: OpencodeClient,
  sessionId: string,
): Promise<void> {
  const result = await client.session.delete({ path: { id: sessionId } })
  if (result.error) {
    throw new Error(`Failed to delete session: ${JSON.stringify(result.error)}`)
  }
}
