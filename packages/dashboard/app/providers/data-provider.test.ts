import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { dataProvider } from "./data-provider";

const API_URL = "http://localhost:3100";

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe("dataProvider", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    (global as any).localStorage = mockLocalStorage;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    mockLocalStorage.clear();
  });

  describe("getList", () => {
    it("returns empty data for unknown resource", async () => {
      const result = await dataProvider.getList!({ resource: "unknown" });
      expect(result).toEqual({ data: [], total: 0 });
    });

    it("returns tasks array with correct format", async () => {
      const mockTasks = [
        { id: "1", name: "Task 1" },
        { id: "2", name: "Task 2" },
      ];

      global.fetch = async () =>
        new Response(JSON.stringify({ ok: true, data: mockTasks }), {
          status: 200,
        });

      const result = await dataProvider.getList!({ resource: "tasks" });
      expect(result).toEqual({ data: mockTasks, total: 2 });
    });

    it("returns services array with correct format", async () => {
      const mockServices = [{ id: "1", name: "Service 1" }];

      global.fetch = async () =>
        new Response(JSON.stringify({ ok: true, data: mockServices }), {
          status: 200,
        });

      const result = await dataProvider.getList!({ resource: "services" });
      expect(result).toEqual({ data: mockServices, total: 1 });
    });

    it("returns skills array with correct format", async () => {
      const mockSkills = [{ id: "1", name: "Skill 1" }];

      global.fetch = async () =>
        new Response(JSON.stringify({ ok: true, data: mockSkills }), {
          status: 200,
        });

      const result = await dataProvider.getList!({ resource: "skills" });
      expect(result).toEqual({ data: mockSkills, total: 1 });
    });

    it("wraps budget single object in array", async () => {
      const mockBudget = { spent: 100, remaining: 900 };

      global.fetch = async () =>
        new Response(JSON.stringify({ ok: true, data: mockBudget }), {
          status: 200,
        });

      const result = await dataProvider.getList!({ resource: "budget" });
      expect(result).toEqual({ data: [mockBudget], total: 1 });
    });

    it("returns empty data on network failure", async () => {
      global.fetch = async () => {
        throw new Error("Network error");
      };

      const result = await dataProvider.getList!({ resource: "tasks" });
      expect(result).toEqual({ data: [], total: 0 });
    });

    it("returns empty data when API returns ok: false", async () => {
      global.fetch = async () =>
        new Response(JSON.stringify({ ok: false, error: "Not found" }), {
          status: 404,
        });

      const result = await dataProvider.getList!({ resource: "tasks" });
      expect(result).toEqual({ data: [], total: 0 });
    });

    it("includes auth header when token in localStorage", async () => {
      const mockTasks = [{ id: "1", name: "Task 1" }];
      let capturedHeaders: HeadersInit | undefined;

      global.fetch = async (url, init) => {
        capturedHeaders = init?.headers;
        return new Response(JSON.stringify({ ok: true, data: mockTasks }), {
          status: 200,
        });
      };

      (global as any).window = {};
      mockLocalStorage.setItem("arachne_token", "test-token-123");

      await dataProvider.getList!({ resource: "tasks" });

      expect(capturedHeaders).toBeDefined();
      const headersObj = capturedHeaders as Record<string, string>;
      expect(headersObj.Authorization).toBe("Bearer test-token-123");

      delete (global as any).window;
    });
  });

  describe("getOne", () => {
    it("returns context object", async () => {
      const mockContext = { projectId: "123", name: "Test Project" };

      global.fetch = async () =>
        new Response(JSON.stringify({ ok: true, data: mockContext }), {
          status: 200,
        });

      const result = await dataProvider.getOne!({ resource: "context", id: "" });
      expect(result).toEqual({ data: mockContext });
    });

    it("returns health object", async () => {
      const mockHealth = { status: "ok", uptime: 12345 };

      global.fetch = async () =>
        new Response(JSON.stringify({ ok: true, data: mockHealth }), {
          status: 200,
        });

      const result = await dataProvider.getOne!({ resource: "health", id: "" });
      expect(result).toEqual({ data: mockHealth });
    });

    it("returns empty object for unknown resource", async () => {
      const result = await dataProvider.getOne!({
        resource: "unknown",
        id: "",
      });
      expect(result).toEqual({ data: {} });
    });

    it("returns empty object on network failure", async () => {
      global.fetch = async () => {
        throw new Error("Network error");
      };

      const result = await dataProvider.getOne!({
        resource: "context",
        id: "",
      });
      expect(result).toEqual({ data: {} });
    });

    it("returns empty object when API returns ok: false", async () => {
      global.fetch = async () =>
        new Response(JSON.stringify({ ok: false, error: "Not found" }), {
          status: 404,
        });

      const result = await dataProvider.getOne!({
        resource: "context",
        id: "",
      });
      expect(result).toEqual({ data: {} });
    });
  });

  describe("create", () => {
    it("throws not implemented error", async () => {
      try {
        await dataProvider.create!({ resource: "tasks", values: {} });
        expect.unreachable();
      } catch (e) {
        expect((e as Error).message).toContain("Not implemented");
      }
    });
  });

  describe("update", () => {
    it("throws not implemented error", async () => {
      try {
        await dataProvider.update!({ resource: "tasks", id: "1", values: {} });
        expect.unreachable();
      } catch (e) {
        expect((e as Error).message).toContain("Not implemented");
      }
    });
  });

  describe("deleteOne", () => {
    it("throws not implemented error", async () => {
      try {
        await dataProvider.deleteOne!({ resource: "tasks", id: "1" });
        expect.unreachable();
      } catch (e) {
        expect((e as Error).message).toContain("Not implemented");
      }
    });
  });

  describe("getApiUrl", () => {
    it("returns API URL", () => {
      const url = dataProvider.getApiUrl!();
      expect(url).toBe(API_URL);
    });
  });
});
