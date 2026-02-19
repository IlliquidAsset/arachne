import { describe, it, expect } from "bun:test";
import { discoverServices, type ServiceDiscoveryDeps } from "../service-discovery";

function makeDeps(overrides?: Partial<ServiceDiscoveryDeps>): ServiceDiscoveryDeps {
  return {
    env: {},
    homeDir: "/Users/test",
    existsSync: () => false,
    readFile: () => "",
    readDir: () => [],
    ...overrides,
  };
}

describe("discoverServices", () => {
  it("detects ANTHROPIC_API_KEY when set", () => {
    const result = discoverServices(makeDeps({ env: { ANTHROPIC_API_KEY: "sk-ant-test123" } }));
    const anthropic = result.services.find((s) => s.name === "Anthropic");
    expect(anthropic?.available).toBe(true);
    expect(anthropic?.detail).toContain("14 chars");
  });

  it("marks Anthropic unavailable when key missing", () => {
    const result = discoverServices(makeDeps({ env: {} }));
    const anthropic = result.services.find((s) => s.name === "Anthropic");
    expect(anthropic?.available).toBe(false);
  });

  it("detects XAI_API_KEY", () => {
    const result = discoverServices(makeDeps({ env: { XAI_API_KEY: "xai-key" } }));
    const xai = result.services.find((s) => s.name === "xAI (Grok)");
    expect(xai?.available).toBe(true);
  });

  it("detects RUNPOD_API_KEY", () => {
    const result = discoverServices(makeDeps({ env: { RUNPOD_API_KEY: "rp-key" } }));
    const runpod = result.services.find((s) => s.name === "RunPod");
    expect(runpod?.available).toBe(true);
  });

  it("treats empty string API key as unavailable", () => {
    const result = discoverServices(makeDeps({ env: { ANTHROPIC_API_KEY: "" } }));
    const anthropic = result.services.find((s) => s.name === "Anthropic");
    expect(anthropic?.available).toBe(false);
  });

  it("detects opencode config when present", () => {
    const result = discoverServices(
      makeDeps({
        existsSync: (p: string) => p.includes("opencode.json"),
        readFile: () => '{"models":{}}',
      }),
    );
    const oc = result.services.find((s) => s.name === "OpenCode");
    expect(oc?.available).toBe(true);
  });

  it("marks opencode unavailable when config missing", () => {
    const result = discoverServices(makeDeps({ existsSync: () => false }));
    const oc = result.services.find((s) => s.name === "OpenCode");
    expect(oc?.available).toBe(false);
  });

  it("marks opencode unavailable when config is invalid JSON", () => {
    const result = discoverServices(
      makeDeps({
        existsSync: (p: string) => p.includes("opencode.json"),
        readFile: () => "not json",
      }),
    );
    const oc = result.services.find((s) => s.name === "OpenCode");
    expect(oc?.available).toBe(false);
    expect(oc?.detail).toContain("invalid JSON");
  });

  it("detects Chrome CDP profiles", () => {
    const result = discoverServices(
      makeDeps({
        existsSync: (p: string) => p.includes(".chrome-cdp-profiles"),
        readDir: () => ["profile1", "profile2"],
      }),
    );
    const cdp = result.services.find((s) => s.name === "Chrome CDP");
    expect(cdp?.available).toBe(true);
    expect(cdp?.detail).toContain("2 profile(s)");
  });

  it("marks CDP unavailable when profiles dir empty", () => {
    const result = discoverServices(
      makeDeps({
        existsSync: (p: string) => p.includes(".chrome-cdp-profiles"),
        readDir: () => [],
      }),
    );
    const cdp = result.services.find((s) => s.name === "Chrome CDP");
    expect(cdp?.available).toBe(false);
  });

  it("includes timestamp", () => {
    const result = discoverServices(makeDeps());
    expect(result.timestamp).toBeTruthy();
  });
});
