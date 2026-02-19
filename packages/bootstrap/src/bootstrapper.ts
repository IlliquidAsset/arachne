import { join } from "node:path";
import { scanEnvironment, type EnvScannerDeps, type EnvScanResult } from "./env-scanner";
import {
  discoverServices,
  type ServiceDiscoveryDeps,
  type ServiceDiscoveryResult,
} from "./service-discovery";
import {
  discoverProjects,
  type ProjectDiscoveryDeps,
  type ProjectDiscoveryResult,
} from "./project-discovery";
import { runHealthCheck, type HealthCheckDeps, type HealthCheckResult } from "./health-check";

export interface BootstrapDeps {
  homeDir: string;
  env: Record<string, string | undefined>;
  existsSync: (path: string) => boolean;
  readFile: (path: string) => string;
  writeFile: (path: string, content: string) => void;
  mkdir: (path: string) => void;
  readDir: (path: string) => string[];
  isDirectory: (path: string) => boolean;
  execSync: (cmd: string) => string;
  platform: () => string;
  openDatabase: (path: string) => { close: () => void; query: (sql: string) => unknown[] };
  initDb: (dbPath: string) => void;
  log: (message: string) => void;
}

export type BootstrapStepName =
  | "env-scan"
  | "service-discovery"
  | "project-discovery"
  | "db-init"
  | "config-generation"
  | "spdd-legend-adoption"
  | "oc-fork-setup"
  | "health-check";

export interface BootstrapStepResult {
  step: BootstrapStepName;
  success: boolean;
  detail: string;
}

export interface BootstrapResult {
  success: boolean;
  steps: BootstrapStepResult[];
  envScan: EnvScanResult | null;
  serviceDiscovery: ServiceDiscoveryResult | null;
  projectDiscovery: ProjectDiscoveryResult | null;
  healthCheck: HealthCheckResult | null;
  timestamp: string;
}

function buildEnvScannerDeps(deps: BootstrapDeps): EnvScannerDeps {
  return {
    platform: deps.platform,
    env: deps.env,
    execSync: deps.execSync,
    homeDir: deps.homeDir,
  };
}

function buildServiceDiscoveryDeps(deps: BootstrapDeps): ServiceDiscoveryDeps {
  return {
    env: deps.env,
    homeDir: deps.homeDir,
    existsSync: deps.existsSync,
    readFile: deps.readFile,
    readDir: deps.readDir,
  };
}

function buildProjectDiscoveryDeps(deps: BootstrapDeps): ProjectDiscoveryDeps {
  return {
    homeDir: deps.homeDir,
    existsSync: deps.existsSync,
    readDir: deps.readDir,
    isDirectory: deps.isDirectory,
  };
}

function buildHealthCheckDeps(deps: BootstrapDeps): HealthCheckDeps {
  return {
    homeDir: deps.homeDir,
    existsSync: deps.existsSync,
    readFile: deps.readFile,
    openDatabase: deps.openDatabase,
  };
}

function stepEnvScan(deps: BootstrapDeps): { result: EnvScanResult; step: BootstrapStepResult } {
  try {
    const result = scanEnvironment(buildEnvScannerDeps(deps));
    const availableTools = result.tools.filter((t) => t.available).map((t) => t.name);
    return {
      result,
      step: {
        step: "env-scan",
        success: true,
        detail: `OS: ${result.os}, Shell: ${result.shell}, Tools: ${availableTools.join(", ") || "none"}`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      result: { os: "unknown", shell: "unknown", homeDir: deps.homeDir, tools: [], timestamp: new Date().toISOString() },
      step: { step: "env-scan", success: false, detail: `Env scan failed: ${msg}` },
    };
  }
}

function stepServiceDiscovery(
  deps: BootstrapDeps,
): { result: ServiceDiscoveryResult; step: BootstrapStepResult } {
  try {
    const result = discoverServices(buildServiceDiscoveryDeps(deps));
    const available = result.services.filter((s) => s.available).map((s) => s.name);
    return {
      result,
      step: {
        step: "service-discovery",
        success: true,
        detail: `Discovered: ${available.join(", ") || "none"}`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      result: { services: [], timestamp: new Date().toISOString() },
      step: { step: "service-discovery", success: false, detail: `Service discovery failed: ${msg}` },
    };
  }
}

function stepProjectDiscovery(
  deps: BootstrapDeps,
): { result: ProjectDiscoveryResult; step: BootstrapStepResult } {
  try {
    const result = discoverProjects(buildProjectDiscoveryDeps(deps));
    const withOc = result.projects.filter((p) => p.hasOpencode);
    return {
      result,
      step: {
        step: "project-discovery",
        success: true,
        detail: `${result.projects.length} git repos, ${withOc.length} with .opencode`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      result: { devDir: "", projects: [], timestamp: new Date().toISOString() },
      step: { step: "project-discovery", success: false, detail: `Project discovery failed: ${msg}` },
    };
  }
}

function stepDbInit(deps: BootstrapDeps): BootstrapStepResult {
  const dbPath = join(deps.homeDir, ".config", "arachne", "arachne.db");

  try {
    const dbDir = join(deps.homeDir, ".config", "arachne");
    if (!deps.existsSync(dbDir)) {
      deps.mkdir(dbDir);
    }
    deps.initDb(dbPath);
    return { step: "db-init", success: true, detail: `Database initialized at ${dbPath}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { step: "db-init", success: false, detail: `DB init failed: ${msg}` };
  }
}

function stepConfigGeneration(
  deps: BootstrapDeps,
  serviceDiscovery: ServiceDiscoveryResult,
): BootstrapStepResult {
  const configDir = join(deps.homeDir, ".config", "arachne");
  const configPath = join(configDir, "arachne.json");
  const servicesPath = join(configDir, "services.json");

  try {
    if (!deps.existsSync(configDir)) {
      deps.mkdir(configDir);
    }

    // Generate arachne.json (idempotent: only write if missing)
    if (!deps.existsSync(configPath)) {
      const config = {
        ports: { web: 3100, voice: 8090 },
        paths: {
          db: "~/.config/arachne/arachne.db",
          skills: "~/.config/opencode/skills/",
        },
        providers: {
          anthropic: { envVar: "ANTHROPIC_API_KEY" },
          xai: { envVar: "XAI_API_KEY" },
          runpod: { envVar: "RUNPOD_API_KEY" },
        },
        features: { voice: false, web: true, autonomy: true },
      };
      deps.writeFile(configPath, JSON.stringify(config, null, 2));
    }

    // Generate services.json from discovered services (always update)
    const serviceEntries = serviceDiscovery.services
      .filter((s) => s.available)
      .map((s) => ({
        name: s.name,
        type: s.type === "api-key" ? "api" : s.type,
        url: "",
        status: "active" as const,
        discoveredAt: serviceDiscovery.timestamp,
        lastChecked: serviceDiscovery.timestamp,
      }));

    deps.writeFile(servicesPath, JSON.stringify({ services: serviceEntries }, null, 2));

    return {
      step: "config-generation",
      success: true,
      detail: `Config at ${configPath}, services at ${servicesPath}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { step: "config-generation", success: false, detail: `Config generation failed: ${msg}` };
  }
}

export interface SpddAdoptionResult {
  legendExists: boolean;
  legendPath: string;
  refinementReady: boolean;
}

function stepSpddLegendAdoption(deps: BootstrapDeps): {
  result: SpddAdoptionResult;
  step: BootstrapStepResult;
} {
  const spddDir = join(deps.homeDir, ".config", "arachne", "spdd");
  const legendPath = join(spddDir, "legend.md");

  try {
    if (!deps.existsSync(spddDir)) {
      deps.mkdir(spddDir);
    }

    const legendExists = deps.existsSync(legendPath);

    if (legendExists) {
      const content = deps.readFile(legendPath);
      return {
        result: { legendExists: true, legendPath, refinementReady: content.length > 0 },
        step: {
          step: "spdd-legend-adoption",
          success: true,
          detail: `Legend exists at ${legendPath} (${content.length} chars), refinement ready`,
        },
      };
    }

    // No legend yet — mark as ready for refinement but don't block bootstrap
    return {
      result: { legendExists: false, legendPath, refinementReady: false },
      step: {
        step: "spdd-legend-adoption",
        success: true,
        detail: `No legend at ${legendPath}, awaiting Muse refinement`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      result: { legendExists: false, legendPath, refinementReady: false },
      step: { step: "spdd-legend-adoption", success: false, detail: `SPDD adoption failed: ${msg}` },
    };
  }
}

function stepOcForkSetup(deps: BootstrapDeps): BootstrapStepResult {
  const forkPath = join(deps.homeDir, "Documents", "dev", "oh-my-opencode-arachne-fork");

  if (deps.existsSync(forkPath)) {
    return {
      step: "oc-fork-setup",
      success: true,
      detail: `Fork exists at ${forkPath}`,
    };
  }

  // Don't clone — just report the command needed
  return {
    step: "oc-fork-setup",
    success: true,
    detail: `Fork not found at ${forkPath}. Clone with: git clone https://github.com/code-yeongyu/oh-my-opencode.git ${forkPath}`,
  };
}

function stepHealthCheck(
  deps: BootstrapDeps,
): { result: HealthCheckResult; step: BootstrapStepResult } {
  try {
    const result = runHealthCheck(buildHealthCheckDeps(deps));
    const summary = result.checks.map((c) => `${c.name}:${c.status}`).join(", ");
    return {
      result,
      step: {
        step: "health-check",
        success: result.healthy,
        detail: `Health: ${result.healthy ? "OK" : "DEGRADED"} [${summary}]`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      result: { healthy: false, checks: [], timestamp: new Date().toISOString() },
      step: { step: "health-check", success: false, detail: `Health check failed: ${msg}` },
    };
  }
}

export function bootstrap(deps: BootstrapDeps): BootstrapResult {
  const steps: BootstrapStepResult[] = [];

  deps.log("Arachne bootstrap: starting...");

  // Step 1: Environment scan
  const envScanResult = stepEnvScan(deps);
  steps.push(envScanResult.step);
  deps.log(`  [1/8] ${envScanResult.step.detail}`);

  // Step 2: Service discovery
  const serviceResult = stepServiceDiscovery(deps);
  steps.push(serviceResult.step);
  deps.log(`  [2/8] ${serviceResult.step.detail}`);

  // Step 3: Project discovery
  const projectResult = stepProjectDiscovery(deps);
  steps.push(projectResult.step);
  deps.log(`  [3/8] ${projectResult.step.detail}`);

  // Step 4: Database init
  const dbStep = stepDbInit(deps);
  steps.push(dbStep);
  deps.log(`  [4/8] ${dbStep.detail}`);

  // Step 5: Config generation
  const configStep = stepConfigGeneration(deps, serviceResult.result);
  steps.push(configStep);
  deps.log(`  [5/8] ${configStep.detail}`);

  // Step 6: SPDD legend adoption
  const spddResult = stepSpddLegendAdoption(deps);
  steps.push(spddResult.step);
  deps.log(`  [6/8] ${spddResult.step.detail}`);

  // Step 7: OC fork setup
  const ocStep = stepOcForkSetup(deps);
  steps.push(ocStep);
  deps.log(`  [7/8] ${ocStep.detail}`);

  // Step 8: Health check
  const healthResult = stepHealthCheck(deps);
  steps.push(healthResult.step);
  deps.log(`  [8/8] ${healthResult.step.detail}`);

  const allSuccess = steps.every((s) => s.success);

  // Summary
  const availableServices = serviceResult.result.services
    .filter((s) => s.available)
    .map((s) => s.name);
  const serviceSummary = availableServices.length > 0 ? availableServices.join(", ") : "none";
  deps.log(
    `Arachne operational — ${steps.filter((s) => s.success).length}/${steps.length} steps passed, services: [${serviceSummary}]`,
  );

  return {
    success: allSuccess,
    steps,
    envScan: envScanResult.result,
    serviceDiscovery: serviceResult.result,
    projectDiscovery: projectResult.result,
    healthCheck: healthResult.result,
    timestamp: new Date().toISOString(),
  };
}
