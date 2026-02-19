import { describe, it, expect } from "bun:test";
import { runHealthCheck, type HealthCheckDeps } from "../health-check";

function makeDeps(overrides?: Partial<HealthCheckDeps>): HealthCheckDeps {
  return {
    homeDir: "/Users/test",
    existsSync: () => false,
    readFile: () => "",
    openDatabase: () => ({ close: () => {}, query: () => [{ ok: 1 }] }),
    ...overrides,
  };
}

describe("runHealthCheck", () => {
  it("returns healthy when all subsystems skip (nothing installed)", () => {
    const result = runHealthCheck(makeDeps());
    expect(result.healthy).toBe(true);
    expect(result.checks.every((c) => c.status === "skip")).toBe(true);
  });

  it("sqlite passes when DB exists and queries work", () => {
    const result = runHealthCheck(
      makeDeps({
        existsSync: (p: string) => p.includes("arachne.db"),
        openDatabase: () => ({ close: () => {}, query: () => [{ ok: 1 }] }),
      }),
    );
    const sqlite = result.checks.find((c) => c.name === "sqlite");
    expect(sqlite?.status).toBe("pass");
  });

  it("sqlite fails when DB throws on query", () => {
    const result = runHealthCheck(
      makeDeps({
        existsSync: (p: string) => p.includes("arachne.db"),
        openDatabase: () => ({
          close: () => {},
          query: () => {
            throw new Error("corrupt db");
          },
        }),
      }),
    );
    const sqlite = result.checks.find((c) => c.name === "sqlite");
    expect(sqlite?.status).toBe("fail");
    expect(sqlite?.reason).toContain("corrupt db");
  });

  it("sqlite skips when DB file missing", () => {
    const result = runHealthCheck(makeDeps({ existsSync: () => false }));
    const sqlite = result.checks.find((c) => c.name === "sqlite");
    expect(sqlite?.status).toBe("skip");
  });

  it("config passes when valid JSON exists", () => {
    const result = runHealthCheck(
      makeDeps({
        existsSync: (p: string) => p.includes("arachne.json"),
        readFile: () => '{"ports":{"web":3100}}',
      }),
    );
    const config = result.checks.find((c) => c.name === "config");
    expect(config?.status).toBe("pass");
  });

  it("config fails on invalid JSON", () => {
    const result = runHealthCheck(
      makeDeps({
        existsSync: (p: string) => p.includes("arachne.json"),
        readFile: () => "{broken",
      }),
    );
    const config = result.checks.find((c) => c.name === "config");
    expect(config?.status).toBe("fail");
  });

  it("services passes with valid services.json", () => {
    const result = runHealthCheck(
      makeDeps({
        existsSync: (p: string) => p.includes("services.json"),
        readFile: () => '{"services":[{"name":"test"}]}',
      }),
    );
    const svc = result.checks.find((c) => c.name === "services");
    expect(svc?.status).toBe("pass");
    expect(svc?.reason).toContain("1 service(s)");
  });

  it("services fails when services array missing", () => {
    const result = runHealthCheck(
      makeDeps({
        existsSync: (p: string) => p.includes("services.json"),
        readFile: () => '{"notServices":true}',
      }),
    );
    const svc = result.checks.find((c) => c.name === "services");
    expect(svc?.status).toBe("fail");
  });

  it("spdd passes when legend exists with content", () => {
    const result = runHealthCheck(
      makeDeps({
        existsSync: (p: string) => p.includes("legend.md"),
        readFile: () => "## PART A\nIdentity content here",
      }),
    );
    const spdd = result.checks.find((c) => c.name === "spdd");
    expect(spdd?.status).toBe("pass");
  });

  it("spdd fails when legend file is empty", () => {
    const result = runHealthCheck(
      makeDeps({
        existsSync: (p: string) => p.includes("legend.md"),
        readFile: () => "",
      }),
    );
    const spdd = result.checks.find((c) => c.name === "spdd");
    expect(spdd?.status).toBe("fail");
  });

  it("marks unhealthy when any check fails", () => {
    const result = runHealthCheck(
      makeDeps({
        existsSync: (p: string) => p.includes("arachne.json"),
        readFile: () => "{invalid",
      }),
    );
    expect(result.healthy).toBe(false);
  });

  it("includes timestamp", () => {
    const result = runHealthCheck(makeDeps());
    expect(result.timestamp).toBeTruthy();
  });

  it("checks all four subsystems", () => {
    const result = runHealthCheck(makeDeps());
    const names = result.checks.map((c) => c.name);
    expect(names).toEqual(["sqlite", "config", "services", "spdd"]);
  });
});
