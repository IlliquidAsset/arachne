import type {
  NotionResult,
  NotionPage,
  NotionBlock,
  NotionBlockList,
  NotionDatabase,
  NotionSearchResult,
  NotionRichText,
  NotionUser,
} from "./types"

const NOTION_API = "https://api.notion.com/v1"
const NOTION_VERSION = "2022-06-28"

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  }
}

async function notionFetch<T>(
  token: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<NotionResult<T>> {
  try {
    const response = await fetch(`${NOTION_API}${path}`, {
      method: options.method ?? "GET",
      headers: headers(token),
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      return {
        ok: false,
        error: (data.message as string) ?? `Notion API error ${response.status}`,
        status: response.status,
      }
    }

    return { ok: true, data: data as T }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function testConnection(
  token: string,
): Promise<NotionResult<NotionUser>> {
  return notionFetch<NotionUser>(token, "/users/me")
}

export async function searchPages(
  token: string,
  query: string,
  opts: { pageSize?: number; startCursor?: string; filter?: "page" | "database" } = {},
): Promise<NotionResult<NotionSearchResult>> {
  const body: Record<string, unknown> = { query, page_size: opts.pageSize ?? 10 }
  if (opts.startCursor) body.start_cursor = opts.startCursor
  if (opts.filter) body.filter = { value: opts.filter, property: "object" }

  return notionFetch<NotionSearchResult>(token, "/search", {
    method: "POST",
    body,
  })
}

export async function getPage(
  token: string,
  pageId: string,
): Promise<NotionResult<NotionPage>> {
  return notionFetch<NotionPage>(token, `/pages/${pageId}`)
}

export async function getPageBlocks(
  token: string,
  blockId: string,
  startCursor?: string,
): Promise<NotionResult<NotionBlockList>> {
  const qs = startCursor ? `?start_cursor=${startCursor}` : ""
  return notionFetch<NotionBlockList>(
    token,
    `/blocks/${blockId}/children${qs}`,
  )
}

export async function createPage(
  token: string,
  parent: { database_id: string } | { page_id: string },
  properties: Record<string, unknown>,
  children?: unknown[],
): Promise<NotionResult<NotionPage>> {
  const body: Record<string, unknown> = { parent, properties }
  if (children && children.length > 0) body.children = children

  return notionFetch<NotionPage>(token, "/pages", {
    method: "POST",
    body,
  })
}

export async function updatePage(
  token: string,
  pageId: string,
  properties: Record<string, unknown>,
): Promise<NotionResult<NotionPage>> {
  return notionFetch<NotionPage>(token, `/pages/${pageId}`, {
    method: "PATCH",
    body: { properties },
  })
}

export async function appendBlocks(
  token: string,
  blockId: string,
  children: unknown[],
): Promise<NotionResult<NotionBlockList>> {
  return notionFetch<NotionBlockList>(token, `/blocks/${blockId}/children`, {
    method: "PATCH",
    body: { children },
  })
}

export async function queryDatabase(
  token: string,
  databaseId: string,
  opts: { filter?: unknown; sorts?: unknown[]; pageSize?: number; startCursor?: string } = {},
): Promise<NotionResult<NotionSearchResult>> {
  const body: Record<string, unknown> = { page_size: opts.pageSize ?? 10 }
  if (opts.filter) body.filter = opts.filter
  if (opts.sorts) body.sorts = opts.sorts
  if (opts.startCursor) body.start_cursor = opts.startCursor

  return notionFetch<NotionSearchResult>(token, `/databases/${databaseId}/query`, {
    method: "POST",
    body,
  })
}

export async function getDatabase(
  token: string,
  databaseId: string,
): Promise<NotionResult<NotionDatabase>> {
  return notionFetch<NotionDatabase>(token, `/databases/${databaseId}`)
}

export async function listDatabases(
  token: string,
  pageSize = 10,
): Promise<NotionResult<NotionSearchResult>> {
  return searchPages(token, "", { pageSize, filter: "database" })
}

/**
 * Flatten rich text array to a plain string.
 */
export function richTextToPlain(rt: NotionRichText[] | undefined): string {
  if (!rt) return ""
  return rt.map((t) => t.plain_text).join("")
}

/**
 * Extract a readable title from a page's properties.
 */
export function extractTitle(page: NotionPage): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === "title" && prop.title) {
      return richTextToPlain(prop.title)
    }
  }
  return "Untitled"
}

/**
 * Convert blocks to a simple markdown-like text representation.
 */
export function blocksToText(blocks: NotionBlock[]): string {
  const lines: string[] = []

  for (const block of blocks) {
    const blockData = block[block.type] as
      | { rich_text?: NotionRichText[]; text?: NotionRichText[] }
      | undefined

    const text = richTextToPlain(blockData?.rich_text ?? blockData?.text)

    switch (block.type) {
      case "paragraph":
        lines.push(text)
        break
      case "heading_1":
        lines.push(`# ${text}`)
        break
      case "heading_2":
        lines.push(`## ${text}`)
        break
      case "heading_3":
        lines.push(`### ${text}`)
        break
      case "bulleted_list_item":
        lines.push(`- ${text}`)
        break
      case "numbered_list_item":
        lines.push(`1. ${text}`)
        break
      case "to_do": {
        const checked = (block[block.type] as { checked?: boolean })?.checked
        lines.push(`- [${checked ? "x" : " "}] ${text}`)
        break
      }
      case "toggle":
        lines.push(`> ${text}`)
        break
      case "quote":
        lines.push(`> ${text}`)
        break
      case "code": {
        const lang = (block[block.type] as { language?: string })?.language ?? ""
        lines.push(`\`\`\`${lang}\n${text}\n\`\`\``)
        break
      }
      case "divider":
        lines.push("---")
        break
      case "callout":
        lines.push(`> ${text}`)
        break
      default:
        if (text) lines.push(text)
        break
    }
  }

  return lines.join("\n\n")
}
