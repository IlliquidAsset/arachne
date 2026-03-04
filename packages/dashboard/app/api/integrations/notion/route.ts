import { NextRequest } from "next/server";
import { jsonResponse, requireAuth } from "@/app/lib/api-helpers";
import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const INTEGRATIONS_DIR = join(homedir(), ".config", "arachne");
const INTEGRATIONS_FILE = join(INTEGRATIONS_DIR, "integrations.json");
const NOTION_API = "https://api.notion.com/v1";

interface NotionIntegration {
  token: string;
  workspaceName?: string;
  connectedAt: string;
}

interface IntegrationsFile {
  notion?: NotionIntegration;
}

function loadIntegrations(): IntegrationsFile {
  try {
    if (!existsSync(INTEGRATIONS_FILE)) return {};
    const raw = readFileSync(INTEGRATIONS_FILE, "utf-8");
    return JSON.parse(raw) as IntegrationsFile;
  } catch {
    return {};
  }
}

function saveIntegrations(data: IntegrationsFile): void {
  mkdirSync(INTEGRATIONS_DIR, { recursive: true });
  writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
  chmodSync(INTEGRATIONS_FILE, 0o600);
}

async function testNotionToken(token: string): Promise<{ ok: boolean; workspaceName?: string; error?: string }> {
  try {
    const res = await fetch(`${NOTION_API}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: false, error: (data.message as string) || `Notion API returned ${res.status}` };
    }

    const user = (await res.json()) as Record<string, unknown>;
    const bot = user.bot as Record<string, unknown> | undefined;
    const workspaceName = (bot?.workspace_name as string) ?? (user.name as string) ?? "Unknown workspace";
    return { ok: true, workspaceName };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Connection failed" };
  }
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const integrations = loadIntegrations();
  const notion = integrations.notion;

  if (!notion) {
    return jsonResponse({ connected: false });
  }

  return jsonResponse({
    connected: true,
    workspaceName: notion.workspaceName ?? null,
    connectedAt: notion.connectedAt,
    tokenPreview: `${notion.token.slice(0, 8)}...${notion.token.slice(-4)}`,
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return jsonResponse({ error: "Token is required" }, 400);
    }

    // Validate token against Notion API
    const test = await testNotionToken(token);
    if (!test.ok) {
      return jsonResponse({ error: `Connection failed: ${test.error}` }, 400);
    }

    // Save to integrations.json
    const integrations = loadIntegrations();
    integrations.notion = {
      token,
      workspaceName: test.workspaceName,
      connectedAt: new Date().toISOString(),
    };
    saveIntegrations(integrations);

    return jsonResponse({
      connected: true,
      workspaceName: test.workspaceName,
      connectedAt: integrations.notion.connectedAt,
      tokenPreview: `${token.slice(0, 8)}...${token.slice(-4)}`,
    });
  } catch {
    return jsonResponse({ error: "Failed to save integration" }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const integrations = loadIntegrations();
  delete integrations.notion;
  saveIntegrations(integrations);

  return jsonResponse({ connected: false });
}
