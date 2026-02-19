import { join } from "node:path";

export interface HealthCheckDeps {
  homeDir: string;
  existsSync: (path: string) => boolean;
  readFile: (path: string) => string;
  openDatabase: (path: string) => { close: () => void; query: (sql: string) => unknown[] };
}

export type SubsystemStatus = "pass" | "fail" | "skip";

export interface SubsystemCheck {
  name: string;
  status: SubsystemStatus;
  reason: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  checks: SubsystemCheck[];
  timestamp: string;
}

function checkSqlite(deps: HealthCheckDeps): SubsystemCheck {
  const dbPath = join(deps.homeDir, ".config", "arachne", "arachne.db");

  if (!deps.existsSync(dbPath)) {
    return { name: "sqlite", status: "skip", reason: `Database not found at ${dbPath}` };
  }

  try {
    const db = deps.openDatabase(dbPath);
    const rows = db.query("SELECT 1 AS ok");
    db.close();

    if (Array.isArray(rows) && rows.length > 0) {
      return { name: "sqlite", status: "pass", reason: "Database operational" };
    }

    return { name: "sqlite", status: "fail", reason: "Query returned no results" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name: "sqlite", status: "fail", reason: `Database error: ${message}` };
  }
}

function checkConfig(deps: HealthCheckDeps): SubsystemCheck {
  const configPath = join(deps.homeDir, ".config", "arachne", "arachne.json");

  if (!deps.existsSync(configPath)) {
    return { name: "config", status: "skip", reason: `Config not found at ${configPath}` };
  }

  try {
    const content = deps.readFile(configPath);
    JSON.parse(content);
    return { name: "config", status: "pass", reason: "Config valid JSON" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name: "config", status: "fail", reason: `Config parse error: ${message}` };
  }
}

function checkServicesRegistry(deps: HealthCheckDeps): SubsystemCheck {
  const servicesPath = join(deps.homeDir, ".config", "arachne", "services.json");

  if (!deps.existsSync(servicesPath)) {
    return { name: "services", status: "skip", reason: `Services registry not found at ${servicesPath}` };
  }

  try {
    const content = deps.readFile(servicesPath);
    const parsed = JSON.parse(content) as { services?: unknown[] };

    if (Array.isArray(parsed.services)) {
      return {
        name: "services",
        status: "pass",
        reason: `${parsed.services.length} service(s) registered`,
      };
    }

    return { name: "services", status: "fail", reason: "Missing services array" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name: "services", status: "fail", reason: `Services parse error: ${message}` };
  }
}

function checkSpddLegend(deps: HealthCheckDeps): SubsystemCheck {
  const legendPath = join(deps.homeDir, ".config", "arachne", "spdd", "legend.md");

  if (!deps.existsSync(legendPath)) {
    return { name: "spdd", status: "skip", reason: `Legend not found at ${legendPath}` };
  }

  try {
    const content = deps.readFile(legendPath);

    if (content.length > 0) {
      return { name: "spdd", status: "pass", reason: `Legend loaded (${content.length} chars)` };
    }

    return { name: "spdd", status: "fail", reason: "Legend file is empty" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name: "spdd", status: "fail", reason: `Legend read error: ${message}` };
  }
}

export function runHealthCheck(deps: HealthCheckDeps): HealthCheckResult {
  const checks: SubsystemCheck[] = [
    checkSqlite(deps),
    checkConfig(deps),
    checkServicesRegistry(deps),
    checkSpddLegend(deps),
  ];

  const healthy = checks.every((c) => c.status !== "fail");

  return {
    healthy,
    checks,
    timestamp: new Date().toISOString(),
  };
}
