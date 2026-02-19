import { describe, it, expect } from "bun:test";
import { bootstrap, type BootstrapDeps } from "../bootstrapper";
import { discoverProjects } from "../project-discovery";

function makeDeps(overrides?: Partial<BootstrapDeps>): BootstrapDeps {
  const writtenFiles = new Map<string, string>();
  const mkdirCalls: string[] = [];

  return {
    homeDir: "/Users/test",
    env: { SHELL: "/bin/zsh", ANTHROPIC_API_KEY: "sk-test-key" },
    existsSync: () => false,
    readFile: () => "",
    writeFile: (path: string, content: string) => {
      writtenFiles.set(path, content);
    },
    mkdir: (path: string) => {
      mkdirCalls.push(path);
    },
    readDir: () => [],
    isDirectory: () => false,
    execSync: () => "1.0.0",
    platform: () => "darwin",
    openDatabase: () => ({ close: () => {}, query: () => [{ ok: 1 }] }),
    initDb: () => {},
    log: () => {},
    ...overrides,
  };
}

describe("bootstrap", () => {
  it("completes all 8 steps", () => {
    const result = bootstrap(makeDeps());
    expect(result.steps).toHaveLength(8);
  });

  it("returns success when all steps pass", () => {
    const result = bootstrap(makeDeps());
    expect(result.success).toBe(true);
  });

  it("includes env scan results", () => {
    const result = bootstrap(makeDeps());
    expect(result.envScan).not.toBeNull();
    expect(result.envScan?.os).toBe("darwin");
  });

  it("includes service discovery results", () => {
    const result = bootstrap(makeDeps());
    expect(result.serviceDiscovery).not.toBeNull();
    const anthropic = result.serviceDiscovery?.services.find((s) => s.name === "Anthropic");
    expect(anthropic?.available).toBe(true);
  });

  it("includes project discovery results", () => {
    const result = bootstrap(makeDeps());
    expect(result.projectDiscovery).not.toBeNull();
  });

  it("includes health check results", () => {
    const result = bootstrap(makeDeps());
    expect(result.healthCheck).not.toBeNull();
  });

  it("calls initDb with correct path", () => {
    let dbPath = "";
    bootstrap(makeDeps({ initDb: (p: string) => { dbPath = p; } }));
    expect(dbPath).toContain(".config/arachne/arachne.db");
  });

  it("writes config files when they don't exist", () => {
    const written = new Map<string, string>();
    bootstrap(
      makeDeps({
        writeFile: (p: string, c: string) => {
          written.set(p, c);
        },
      }),
    );
    const configKey = [...written.keys()].find((k) => k.includes("arachne.json"));
    expect(configKey).toBeTruthy();
    const servicesKey = [...written.keys()].find((k) => k.includes("services.json"));
    expect(servicesKey).toBeTruthy();
  });

  it("does not overwrite existing arachne.json (idempotent)", () => {
    let writeCount = 0;
    bootstrap(
      makeDeps({
        existsSync: (p: string) => p.includes("arachne.json"),
        writeFile: (p: string) => {
          if (p.includes("arachne.json")) writeCount++;
        },
      }),
    );
    expect(writeCount).toBe(0);
  });

  it("logs 'Arachne operational' message", () => {
    const logs: string[] = [];
    bootstrap(makeDeps({ log: (msg: string) => logs.push(msg) }));
    const operationalLog = logs.find((l) => l.includes("Arachne operational"));
    expect(operationalLog).toBeTruthy();
  });

  it("logs discovered services in summary", () => {
    const logs: string[] = [];
    bootstrap(
      makeDeps({
        env: { ANTHROPIC_API_KEY: "key", XAI_API_KEY: "key2" },
        log: (msg: string) => logs.push(msg),
      }),
    );
    const summary = logs.find((l) => l.includes("Arachne operational"));
    expect(summary).toContain("Anthropic");
  });

  it("reports OC fork status when fork exists", () => {
    const result = bootstrap(
      makeDeps({
        existsSync: (p: string) => p.includes("oh-my-opencode-arachne-fork"),
      }),
    );
    const ocStep = result.steps.find((s) => s.step === "oc-fork-setup");
    expect(ocStep?.detail).toContain("Fork exists");
  });

  it("reports clone command when fork missing", () => {
    const result = bootstrap(makeDeps({ existsSync: () => false }));
    const ocStep = result.steps.find((s) => s.step === "oc-fork-setup");
    expect(ocStep?.detail).toContain("git clone");
  });

  it("handles env scan failure gracefully", () => {
    const result = bootstrap(
      makeDeps({
        platform: () => {
          throw new Error("platform error");
        },
      }),
    );
    const envStep = result.steps.find((s) => s.step === "env-scan");
    expect(envStep?.success).toBe(false);
  });

  it("handles db init failure gracefully", () => {
    const result = bootstrap(
      makeDeps({
        initDb: () => {
          throw new Error("db locked");
        },
      }),
    );
    const dbStep = result.steps.find((s) => s.step === "db-init");
    expect(dbStep?.success).toBe(false);
    expect(dbStep?.detail).toContain("db locked");
  });

  it("includes timestamp", () => {
    const result = bootstrap(makeDeps());
    expect(result.timestamp).toBeTruthy();
  });

  it("is idempotent — running twice produces same step count", () => {
    const deps = makeDeps();
    const first = bootstrap(deps);
    const second = bootstrap(deps);
    expect(first.steps.length).toBe(second.steps.length);
  });
});

describe("discoverProjects", () => {
  it("finds git repos in dev directory", () => {
    const result = discoverProjects({
      homeDir: "/Users/test",
      existsSync: (p: string) => p.includes("dev") || p.includes(".git"),
      readDir: () => ["arachne", "other-project", "not-a-repo"],
      isDirectory: () => true,
    });
    expect(result.projects.length).toBe(3);
    expect(result.projects[0].hasGit).toBe(true);
  });

  it("detects .opencode directories", () => {
    const result = discoverProjects({
      homeDir: "/Users/test",
      existsSync: (p: string) =>
        p.includes("dev") || p.includes(".git") || p.includes(".opencode"),
      readDir: () => ["arachne"],
      isDirectory: () => true,
    });
    expect(result.projects[0].hasOpencode).toBe(true);
  });

  it("returns empty when dev dir missing", () => {
    const result = discoverProjects({
      homeDir: "/Users/test",
      existsSync: () => false,
      readDir: () => [],
      isDirectory: () => false,
    });
    expect(result.projects).toHaveLength(0);
  });

  it("skips non-directory entries", () => {
    const result = discoverProjects({
      homeDir: "/Users/test",
      existsSync: () => true,
      readDir: () => ["file.txt", "project"],
      isDirectory: (p: string) => p.includes("project"),
    });
    const gitRepos = result.projects.filter((p) => p.hasGit);
    expect(gitRepos.length).toBe(1);
  });
});
