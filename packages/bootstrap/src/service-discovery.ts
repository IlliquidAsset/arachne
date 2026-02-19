import { join } from "node:path";

export interface ServiceDiscoveryDeps {
  env?: Record<string, string | undefined>;
  homeDir: string;
  existsSync: (path: string) => boolean;
  readFile: (path: string) => string;
  readDir: (path: string) => string[];
}

export interface DiscoveredService {
  name: string;
  type: "api-key" | "opencode" | "chrome-cdp";
  available: boolean;
  detail: string;
}

export interface ServiceDiscoveryResult {
  services: DiscoveredService[];
  timestamp: string;
}

const API_KEY_ENV_VARS: Record<string, string> = {
  ANTHROPIC_API_KEY: "Anthropic",
  XAI_API_KEY: "xAI (Grok)",
  RUNPOD_API_KEY: "RunPod",
};

function scanApiKeys(env: Record<string, string | undefined>): DiscoveredService[] {
  const results: DiscoveredService[] = [];

  for (const [envVar, serviceName] of Object.entries(API_KEY_ENV_VARS)) {
    const value = env[envVar];
    const hasKey = typeof value === "string" && value.length > 0;
    results.push({
      name: serviceName,
      type: "api-key",
      available: hasKey,
      detail: hasKey ? `${envVar} set (${value.length} chars)` : `${envVar} not set`,
    });
  }

  return results;
}

function scanOpencodeConfig(deps: ServiceDiscoveryDeps): DiscoveredService {
  const configPath = join(deps.homeDir, ".config", "opencode", "opencode.json");

  if (!deps.existsSync(configPath)) {
    return {
      name: "OpenCode",
      type: "opencode",
      available: false,
      detail: `Config not found at ${configPath}`,
    };
  }

  try {
    const content = deps.readFile(configPath);
    JSON.parse(content);
    return {
      name: "OpenCode",
      type: "opencode",
      available: true,
      detail: `Config found at ${configPath}`,
    };
  } catch {
    return {
      name: "OpenCode",
      type: "opencode",
      available: false,
      detail: `Config at ${configPath} is invalid JSON`,
    };
  }
}

function scanChromeCdpProfiles(deps: ServiceDiscoveryDeps): DiscoveredService {
  const profilesDir = join(deps.homeDir, ".chrome-cdp-profiles");

  if (!deps.existsSync(profilesDir)) {
    return {
      name: "Chrome CDP",
      type: "chrome-cdp",
      available: false,
      detail: `Profiles dir not found at ${profilesDir}`,
    };
  }

  try {
    const entries = deps.readDir(profilesDir);
    const profileCount = entries.length;
    return {
      name: "Chrome CDP",
      type: "chrome-cdp",
      available: profileCount > 0,
      detail: `${profileCount} profile(s) found at ${profilesDir}`,
    };
  } catch {
    return {
      name: "Chrome CDP",
      type: "chrome-cdp",
      available: false,
      detail: `Cannot read profiles dir at ${profilesDir}`,
    };
  }
}

export function discoverServices(deps: ServiceDiscoveryDeps): ServiceDiscoveryResult {
  const env = deps.env ?? {};
  const services: DiscoveredService[] = [
    ...scanApiKeys(env),
    scanOpencodeConfig(deps),
    scanChromeCdpProfiles(deps),
  ];

  return {
    services,
    timestamp: new Date().toISOString(),
  };
}
