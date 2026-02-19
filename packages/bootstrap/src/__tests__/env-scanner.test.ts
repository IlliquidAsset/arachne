import { describe, it, expect } from "bun:test";
import { scanEnvironment, type EnvScannerDeps } from "../env-scanner";

function makeDeps(overrides?: Partial<EnvScannerDeps>): EnvScannerDeps {
  return {
    platform: () => "darwin",
    env: { SHELL: "/bin/zsh", HOME: "/Users/test" },
    execSync: () => "1.0.0",
    homeDir: "/Users/test",
    ...overrides,
  };
}

describe("scanEnvironment", () => {
  it("detects OS from platform()", () => {
    const result = scanEnvironment(makeDeps({ platform: () => "linux" }));
    expect(result.os).toBe("linux");
  });

  it("detects shell from SHELL env var", () => {
    const result = scanEnvironment(makeDeps({ env: { SHELL: "/bin/bash" } }));
    expect(result.shell).toBe("/bin/bash");
  });

  it("falls back to ComSpec on windows-like env", () => {
    const result = scanEnvironment(makeDeps({ env: { ComSpec: "cmd.exe" } }));
    expect(result.shell).toBe("cmd.exe");
  });

  it("returns unknown shell when no env vars set", () => {
    const result = scanEnvironment(makeDeps({ env: {} }));
    expect(result.shell).toBe("unknown");
  });

  it("detects available tools via execSync", () => {
    const result = scanEnvironment(makeDeps({ execSync: () => "1.2.3" }));
    const bun = result.tools.find((t) => t.name === "bun");
    expect(bun?.available).toBe(true);
    expect(bun?.version).toBe("1.2.3");
  });

  it("marks tools unavailable when execSync throws", () => {
    const result = scanEnvironment(
      makeDeps({
        execSync: (cmd: string) => {
          if (cmd.includes("opencode")) throw new Error("not found");
          return "1.0.0";
        },
      }),
    );
    const opencode = result.tools.find((t) => t.name === "opencode");
    expect(opencode?.available).toBe(false);
    expect(opencode?.version).toBeNull();
  });

  it("scans all four expected tools", () => {
    const result = scanEnvironment(makeDeps());
    const names = result.tools.map((t) => t.name);
    expect(names).toContain("bun");
    expect(names).toContain("git");
    expect(names).toContain("node");
    expect(names).toContain("opencode");
  });

  it("uses homeDir from deps", () => {
    const result = scanEnvironment(makeDeps({ homeDir: "/custom/home" }));
    expect(result.homeDir).toBe("/custom/home");
  });

  it("includes timestamp", () => {
    const result = scanEnvironment(makeDeps());
    expect(result.timestamp).toBeTruthy();
    expect(() => new Date(result.timestamp)).not.toThrow();
  });
});
