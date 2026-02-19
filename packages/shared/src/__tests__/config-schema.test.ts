import { describe, it, expect } from "bun:test";
import {
  ArachneGlobalConfigSchema,
  ServicesRegistrySchema,
  type ArachneGlobalConfig,
  type ServicesRegistry,
} from "../config-schema.js";

describe("config-schema", () => {
  describe("ArachneGlobalConfigSchema", () => {
    it("validates a complete valid config", () => {
      const config: ArachneGlobalConfig = {
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

      const result = ArachneGlobalConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("applies default values when fields are missing", () => {
      const result = ArachneGlobalConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ports.web).toBe(3100);
        expect(result.data.ports.voice).toBe(8090);
        expect(result.data.features.voice).toBe(false);
        expect(result.data.features.web).toBe(true);
        expect(result.data.features.autonomy).toBe(true);
        expect(result.data.paths.db).toBe("~/.config/arachne/arachne.db");
      }
    });

    it("allows overriding default ports", () => {
      const result = ArachneGlobalConfigSchema.safeParse({
        ports: { web: 4000, voice: 9000 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ports.web).toBe(4000);
        expect(result.data.ports.voice).toBe(9000);
      }
    });

    it("allows partial overrides with defaults filling in", () => {
      const result = ArachneGlobalConfigSchema.safeParse({
        features: { voice: true },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.features.voice).toBe(true);
        expect(result.data.features.web).toBe(true);
        expect(result.data.features.autonomy).toBe(true);
      }
    });

    it("rejects invalid port type", () => {
      const result = ArachneGlobalConfigSchema.safeParse({
        ports: { web: "not-a-number", voice: 8090 },
      });
      expect(result.success).toBe(false);
    });

    it("allows additional providers", () => {
      const result = ArachneGlobalConfigSchema.safeParse({
        providers: {
          anthropic: { envVar: "ANTHROPIC_API_KEY" },
          xai: { envVar: "XAI_API_KEY" },
          runpod: { envVar: "RUNPOD_API_KEY" },
          openai: { envVar: "OPENAI_API_KEY" },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ServicesRegistrySchema", () => {
    it("validates a complete valid services registry", () => {
      const services: ServicesRegistry = {
        services: [
          {
            name: "opencode-arachne",
            type: "opencode",
            url: "http://localhost:3100",
            status: "active",
            discoveredAt: "2026-02-18T00:00:00Z",
            lastChecked: "2026-02-18T01:00:00Z",
          },
        ],
      };

      const result = ServicesRegistrySchema.safeParse(services);
      expect(result.success).toBe(true);
    });

    it("validates empty services array", () => {
      const result = ServicesRegistrySchema.safeParse({ services: [] });
      expect(result.success).toBe(true);
    });

    it("applies default empty services array", () => {
      const result = ServicesRegistrySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.services).toEqual([]);
      }
    });

    it("validates all service types", () => {
      for (const type of ["opencode", "runpod", "api"] as const) {
        const result = ServicesRegistrySchema.safeParse({
          services: [
            {
              name: `svc-${type}`,
              type,
              url: "http://localhost:3000",
              status: "active",
              discoveredAt: "2026-01-01T00:00:00Z",
              lastChecked: "2026-01-01T00:00:00Z",
            },
          ],
        });
        expect(result.success).toBe(true);
      }
    });

    it("validates all status values", () => {
      for (const status of ["active", "inactive"] as const) {
        const result = ServicesRegistrySchema.safeParse({
          services: [
            {
              name: "svc",
              type: "api",
              url: "http://localhost:3000",
              status,
              discoveredAt: "2026-01-01T00:00:00Z",
              lastChecked: "2026-01-01T00:00:00Z",
            },
          ],
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid service type", () => {
      const result = ServicesRegistrySchema.safeParse({
        services: [
          {
            name: "svc",
            type: "invalid",
            url: "http://localhost:3000",
            status: "active",
            discoveredAt: "2026-01-01T00:00:00Z",
            lastChecked: "2026-01-01T00:00:00Z",
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const result = ServicesRegistrySchema.safeParse({
        services: [
          {
            name: "svc",
            type: "api",
            url: "http://localhost:3000",
            status: "broken",
            discoveredAt: "2026-01-01T00:00:00Z",
            lastChecked: "2026-01-01T00:00:00Z",
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects service missing required fields", () => {
      const result = ServicesRegistrySchema.safeParse({
        services: [{ name: "svc" }],
      });
      expect(result.success).toBe(false);
    });
  });
});
