import { platform } from "node:os";
import { execSync } from "node:child_process";

export interface EnvScannerDeps {
  platform?: () => string;
  env?: Record<string, string | undefined>;
  execSync?: (cmd: string) => string;
  homeDir?: string;
}

export interface ToolInfo {
  name: string;
  available: boolean;
  version: string | null;
}

export interface EnvScanResult {
  os: string;
  shell: string;
  homeDir: string;
  tools: ToolInfo[];
  timestamp: string;
}

const TOOL_VERSION_COMMANDS: Record<string, string> = {
  bun: "bun --version",
  git: "git --version",
  node: "node --version",
  opencode: "opencode --version",
};

const defaultDeps: Required<EnvScannerDeps> = {
  platform: () => platform(),
  env: process.env as Record<string, string | undefined>,
  execSync: (cmd: string) => execSync(cmd, { encoding: "utf-8", timeout: 5000 }).trim(),
  homeDir: "",
};

function resolve(deps?: EnvScannerDeps): Required<EnvScannerDeps> {
  return { ...defaultDeps, ...deps };
}

function detectShell(env: Record<string, string | undefined>): string {
  return env["SHELL"] ?? env["ComSpec"] ?? "unknown";
}

function detectTool(
  name: string,
  versionCmd: string,
  execFn: (cmd: string) => string,
): ToolInfo {
  try {
    const version = execFn(versionCmd);
    return { name, available: true, version };
  } catch {
    return { name, available: false, version: null };
  }
}

export function scanEnvironment(deps?: EnvScannerDeps): EnvScanResult {
  const d = resolve(deps);
  const tools: ToolInfo[] = [];

  for (const [name, cmd] of Object.entries(TOOL_VERSION_COMMANDS)) {
    tools.push(detectTool(name, cmd, d.execSync));
  }

  return {
    os: d.platform(),
    shell: detectShell(d.env),
    homeDir: d.homeDir || d.env["HOME"] || d.env["USERPROFILE"] || "",
    tools,
    timestamp: new Date().toISOString(),
  };
}
