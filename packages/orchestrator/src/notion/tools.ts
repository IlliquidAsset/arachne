import { tool } from "@opencode-ai/plugin/tool"
import {
  searchPages,
  getPage,
  getPageBlocks,
  createPage,
  updatePage,
  appendBlocks,
  queryDatabase,
  getDatabase,
  extractTitle,
  blocksToText,
  richTextToPlain,
} from "./client"
import type { NotionPage, NotionDatabase, NotionRichText } from "./types"
import {
  ensureMemoryNotebook,
  createMemoryPage,
  listMemoryPages,
  readMemoryPage,
} from "./memory-notebook"

function formatPageSummary(page: NotionPage): string {
  const title = extractTitle(page)
  const edited = page.last_edited_time.slice(0, 10)
  return `${title} (id: ${page.id}, edited: ${edited}, url: ${page.url})`
}

function formatDbSummary(db: NotionDatabase): string {
  const title = richTextToPlain(db.title)
  const propNames = Object.keys(db.properties).slice(0, 6).join(", ")
  return `${title || "Untitled DB"} (id: ${db.id}, props: [${propNames}])`
}

export function createNotionTools(token: string): Record<string, ReturnType<typeof tool>> {
  return {
    arachne_notion_search: tool({
      description:
        "Search Notion pages and databases by keyword. Returns titles, IDs, and URLs.",
      args: {
        query: tool.schema.string().describe("Search query"),
        filter: tool.schema
          .enum(["page", "database"])
          .optional()
          .describe("Filter results to pages or databases only"),
        pageSize: tool.schema
          .number()
          .optional()
          .describe("Max results (default 10)"),
      },
      async execute(args) {
        const result = await searchPages(token, args.query, {
          pageSize: args.pageSize,
          filter: args.filter,
        })

        if (!result.ok) return `Notion search failed: ${result.error}`

        const items = result.data.results
        if (items.length === 0) return "No results found."

        const lines = items.map((item) => {
          if (item.object === "database") {
            return `[database] ${formatDbSummary(item as NotionDatabase)}`
          }
          return `[page] ${formatPageSummary(item as NotionPage)}`
        })

        const more = result.data.has_more ? "\n(more results available)" : ""
        return `Found ${items.length} results:\n${lines.join("\n")}${more}`
      },
    }),

    arachne_notion_read: tool({
      description:
        "Read a Notion page's content as markdown text. Provide the page ID.",
      args: {
        pageId: tool.schema
          .string()
          .describe("Notion page ID (UUID, dashes optional)"),
      },
      async execute(args) {
        const pageResult = await getPage(token, args.pageId)
        if (!pageResult.ok) return `Failed to read page: ${pageResult.error}`

        const page = pageResult.data
        const title = extractTitle(page)

        // Fetch all blocks (paginate)
        const allBlocks: import("./types").NotionBlock[] = []
        let cursor: string | undefined
        for (let i = 0; i < 10; i++) {
          const blocksResult = await getPageBlocks(token, args.pageId, cursor)
          if (!blocksResult.ok) break
          allBlocks.push(...blocksResult.data.results)
          if (!blocksResult.data.has_more) break
          cursor = blocksResult.data.next_cursor ?? undefined
        }

        const content = blocksToText(allBlocks)
        const edited = page.last_edited_time.slice(0, 10)

        return [
          `# ${title}`,
          `Last edited: ${edited}`,
          `URL: ${page.url}`,
          "",
          content || "(empty page)",
        ].join("\n")
      },
    }),

    arachne_notion_create: tool({
      description:
        "Create a new Notion page. Specify a parent page ID or database ID, a title, and optional content blocks.",
      args: {
        parentType: tool.schema
          .enum(["page", "database"])
          .describe("Whether parent is a page or database"),
        parentId: tool.schema
          .string()
          .describe("Parent page or database ID"),
        title: tool.schema.string().describe("Page title"),
        content: tool.schema
          .string()
          .optional()
          .describe("Plain text content to add as paragraphs (newline-separated)"),
      },
      async execute(args) {
        const parent =
          args.parentType === "database"
            ? { database_id: args.parentId }
            : { page_id: args.parentId }

        const properties: Record<string, unknown> =
          args.parentType === "database"
            ? { title: { title: [{ text: { content: args.title } }] } }
            : { title: { title: [{ text: { content: args.title } }] } }

        const children: unknown[] = []
        if (args.content) {
          for (const line of args.content.split("\n")) {
            if (line.trim()) {
              children.push({
                object: "block",
                type: "paragraph",
                paragraph: {
                  rich_text: [{ type: "text", text: { content: line } }],
                },
              })
            }
          }
        }

        const result = await createPage(token, parent, properties, children)
        if (!result.ok) return `Failed to create page: ${result.error}`

        return `Created page "${args.title}" (id: ${result.data.id}, url: ${result.data.url})`
      },
    }),

    arachne_notion_update: tool({
      description:
        "Update a Notion page's properties or append content blocks to it.",
      args: {
        pageId: tool.schema.string().describe("Page ID to update"),
        title: tool.schema
          .string()
          .optional()
          .describe("New title (optional)"),
        appendContent: tool.schema
          .string()
          .optional()
          .describe("Text to append as new paragraphs (newline-separated)"),
      },
      async execute(args) {
        const results: string[] = []

        if (args.title) {
          const propResult = await updatePage(token, args.pageId, {
            title: { title: [{ text: { content: args.title } }] },
          })
          if (!propResult.ok)
            return `Failed to update title: ${propResult.error}`
          results.push(`Title updated to "${args.title}"`)
        }

        if (args.appendContent) {
          const children = args.appendContent
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => ({
              object: "block" as const,
              type: "paragraph" as const,
              paragraph: {
                rich_text: [{ type: "text" as const, text: { content: line } }],
              },
            }))

          const appendResult = await appendBlocks(token, args.pageId, children)
          if (!appendResult.ok)
            return `Failed to append content: ${appendResult.error}`
          results.push(`Appended ${children.length} block(s)`)
        }

        if (results.length === 0) return "Nothing to update. Provide title or content."

        return `Updated page ${args.pageId}: ${results.join(", ")}`
      },
    }),

    arachne_notion_query_db: tool({
      description:
        "Query a Notion database. Returns matching pages with their properties.",
      args: {
        databaseId: tool.schema.string().describe("Database ID to query"),
        filter: tool.schema
          .string()
          .optional()
          .describe("JSON filter object (Notion API filter format)"),
        pageSize: tool.schema
          .number()
          .optional()
          .describe("Max results (default 10)"),
      },
      async execute(args) {
        // First get db schema for context
        const dbResult = await getDatabase(token, args.databaseId)
        if (!dbResult.ok) return `Failed to read database: ${dbResult.error}`

        const dbTitle = richTextToPlain(dbResult.data.title)
        const propNames = Object.entries(dbResult.data.properties)
          .map(([name, prop]) => `${name} (${prop.type})`)
          .join(", ")

        let filter: unknown | undefined
        if (args.filter) {
          try {
            filter = JSON.parse(args.filter)
          } catch {
            return "Invalid filter JSON. Provide a valid Notion API filter object."
          }
        }

        const result = await queryDatabase(token, args.databaseId, {
          filter,
          pageSize: args.pageSize,
        })

        if (!result.ok) return `Query failed: ${result.error}`

        const pages = result.data.results as NotionPage[]
        if (pages.length === 0) return `No results in "${dbTitle}".`

        const lines = pages.map((page) => {
          const title = extractTitle(page)
          const props = Object.entries(page.properties)
            .filter(([, v]) => v.type !== "title")
            .slice(0, 5)
            .map(([k, v]) => {
              if (v.type === "rich_text") return `${k}: ${richTextToPlain(v.rich_text)}`
              if (v.type === "select") return `${k}: ${v.select?.name ?? ""}`
              if (v.type === "status") return `${k}: ${v.status?.name ?? ""}`
              if (v.type === "number") return `${k}: ${v.number ?? ""}`
              if (v.type === "checkbox") return `${k}: ${v.checkbox ? "yes" : "no"}`
              if (v.type === "date") return `${k}: ${v.date?.start ?? ""}`
              if (v.type === "multi_select")
                return `${k}: ${v.multi_select?.map((s) => s.name).join(", ") ?? ""}`
              return `${k}: [${v.type}]`
            })
            .join(" | ")

          return `- ${title} (${page.id}) ${props ? `| ${props}` : ""}`
        })

        const more = result.data.has_more ? "\n(more results available)" : ""
        return [
          `Database: ${dbTitle}`,
          `Schema: ${propNames}`,
          `Results (${pages.length}):`,
          ...lines,
          more,
        ]
          .filter(Boolean)
          .join("\n")
      },
    }),

    // ----- Memory Notebook Tools -----

    arachne_memory_write: tool({
      description:
        "Write a new page to the Arachne Memory notebook in Notion. Use this to store curated knowledge, task notes, or any information that should persist across sessions.",
      args: {
        title: tool.schema.string().describe("Title of the memory page"),
        content: tool.schema
          .string()
          .describe("Content to write (plain text, double-newline separated paragraphs)"),
      },
      async execute(args) {
        try {
          const rootId = await ensureMemoryNotebook(token)
          const page = await createMemoryPage(token, rootId, args.title, args.content)
          return `Created memory page "${page.title}" (id: ${page.id})`
        } catch (error) {
          return `Failed to write memory: ${error instanceof Error ? error.message : String(error)}`
        }
      },
    }),

    arachne_memory_read: tool({
      description:
        "Read a page from the Arachne Memory notebook by its page ID. Returns the full content.",
      args: {
        pageId: tool.schema
          .string()
          .describe("Page ID of the memory page to read"),
      },
      async execute(args) {
        try {
          const { title, content } = await readMemoryPage(token, args.pageId)
          return `# ${title}\n\n${content || "(empty page)"}`
        } catch (error) {
          return `Failed to read memory page: ${error instanceof Error ? error.message : String(error)}`
        }
      },
    }),

    arachne_memory_list: tool({
      description:
        "List all pages in the Arachne Memory notebook. Returns titles, IDs, and last edited dates.",
      args: {},
      async execute() {
        try {
          const rootId = await ensureMemoryNotebook(token)
          const pages = await listMemoryPages(token, rootId)

          if (pages.length === 0) return "Memory notebook is empty."

          const lines = pages.map(
            (p) =>
              `- ${p.title} (id: ${p.id}, edited: ${p.lastEdited ? new Date(p.lastEdited).toLocaleDateString() : "unknown"})`,
          )
          return `Arachne Memory — ${pages.length} pages:\n${lines.join("\n")}`
        } catch (error) {
          return `Failed to list memory: ${error instanceof Error ? error.message : String(error)}`
        }
      },
    }),
  }
}
