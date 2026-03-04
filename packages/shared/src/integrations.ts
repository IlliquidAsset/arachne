import { z } from "zod/v4";
import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const INTEGRATIONS_DIR = join(homedir(), ".config", "arachne");
const INTEGRATIONS_FILE = join(INTEGRATIONS_DIR, "integrations.json");

const NotionIntegrationSchema = z.object({
  token: z.string().min(1),
  workspaceName: z.string().optional(),
  connectedAt: z.string(),
  memoryNotebookPageId: z.string().optional(),
});

const IntegrationsSchema = z.object({
  notion: NotionIntegrationSchema.optional(),
});

export type NotionIntegration = z.infer<typeof NotionIntegrationSchema>;
export type Integrations = z.infer<typeof IntegrationsSchema>;

export interface IntegrationsFileOperations {
  readFile: (path: string) => string;
  writeFile: (path: string, data: string) => void;
  mkdir: (path: string) => void;
  chmod: (path: string, mode: number) => void;
  exists: (path: string) => boolean;
}

const defaultOps: IntegrationsFileOperations = {
  readFile: (path) => readFileSync(path, "utf-8"),
  writeFile: (path, data) => writeFileSync(path, data, "utf-8"),
  mkdir: (path) => mkdirSync(path, { recursive: true }),
  chmod: (path, mode) => chmodSync(path, mode),
  exists: (path) => existsSync(path),
};

export function loadIntegrations(
  ops: Pick<IntegrationsFileOperations, "readFile" | "exists"> = defaultOps,
  file: string = INTEGRATIONS_FILE,
): Integrations {
  try {
    if (!ops.exists(file)) {
      return {};
    }
    const raw = ops.readFile(file);
    const parsed = JSON.parse(raw);
    return IntegrationsSchema.parse(parsed);
  } catch {
    return {};
  }
}

export function saveIntegrations(
  integrations: Integrations,
  ops: IntegrationsFileOperations = defaultOps,
  dir: string = INTEGRATIONS_DIR,
  file: string = INTEGRATIONS_FILE,
): void {
  ops.mkdir(dir);
  const data = JSON.stringify(integrations, null, 2);
  ops.writeFile(file, data);
  ops.chmod(file, 0o600);
}

export function getNotionToken(
  ops?: Pick<IntegrationsFileOperations, "readFile" | "exists">,
  file?: string,
): string | null {
  const integrations = loadIntegrations(ops, file);
  return integrations.notion?.token ?? null;
}
