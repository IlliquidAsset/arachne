export interface NotionUser {
  id: string;
  type: "person" | "bot";
  name: string | null;
  avatar_url: string | null;
}

export interface NotionRichText {
  type: "text" | "mention" | "equation";
  plain_text: string;
  href: string | null;
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
  };
  text?: { content: string; link: { url: string } | null };
}

export interface NotionPage {
  id: string;
  object: "page";
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  url: string;
  properties: Record<string, NotionProperty>;
  parent:
    | { type: "database_id"; database_id: string }
    | { type: "page_id"; page_id: string }
    | { type: "workspace"; workspace: true };
}

export interface NotionProperty {
  id: string;
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  number?: number | null;
  select?: { id: string; name: string; color: string } | null;
  multi_select?: { id: string; name: string; color: string }[];
  date?: { start: string; end: string | null } | null;
  checkbox?: boolean;
  url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  status?: { id: string; name: string; color: string } | null;
  [key: string]: unknown;
}

export interface NotionBlock {
  id: string;
  object: "block";
  type: string;
  created_time: string;
  last_edited_time: string;
  has_children: boolean;
  [key: string]: unknown;
}

export interface NotionDatabase {
  id: string;
  object: "database";
  title: NotionRichText[];
  description: NotionRichText[];
  created_time: string;
  last_edited_time: string;
  url: string;
  properties: Record<string, { id: string; type: string; name: string; [key: string]: unknown }>;
}

export interface NotionSearchResult {
  object: "list";
  results: (NotionPage | NotionDatabase)[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface NotionBlockList {
  object: "list";
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface NotionError {
  object: "error";
  status: number;
  code: string;
  message: string;
}

export type NotionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };
