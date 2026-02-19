import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { authProvider } from "./auth-provider";

const TOKEN_KEY = "arachne_token";
const USER_KEY = "arachne_user";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe("authProvider", () => {
  let store: Record<string, string> = {};
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    store = {};
    originalFetch = global.fetch;

    global.localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() { return Object.keys(store).length; },
    } as Storage;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    store = {};
  });

  describe("login", () => {
    it("returns success and stores token on valid response", async () => {
      const futureExp = Date.now() + 3600_000;
      const token = makeJwt({ userId: "user-1", role: "admin", exp: futureExp });

      global.fetch = async () =>
        new Response(
          JSON.stringify({
            ok: true,
            data: { token, userId: "user-1", role: "admin", expiresAt: futureExp },
          }),
          { status: 200 }
        );

      const result = await authProvider.login!({ apiKey: "commander-default-key" });

      expect(result).toEqual({ success: true, redirectTo: "/dashboard" });
      expect(store[TOKEN_KEY]).toBe(token);
      expect(JSON.parse(store[USER_KEY])).toEqual({ id: "user-1", role: "admin" });
    });

    it("returns failure when API returns ok: false", async () => {
      global.fetch = async () =>
        new Response(
          JSON.stringify({ ok: false, error: "Invalid API key" }),
          { status: 401 }
        );

      const result = await authProvider.login!({ apiKey: "bad-key" });

      expect(result.success).toBe(false);
      expect((result as { error: { message: string } }).error.message).toBe("Invalid API key");
      expect(store[TOKEN_KEY]).toBeUndefined();
    });

    it("returns failure when response has no token", async () => {
      global.fetch = async () =>
        new Response(
          JSON.stringify({ ok: true, data: { userId: "user-1" } }),
          { status: 200 }
        );

      const result = await authProvider.login!({ apiKey: "key" });

      expect(result.success).toBe(false);
    });

    it("returns network error on fetch failure", async () => {
      global.fetch = async () => { throw new Error("Network error"); };

      const result = await authProvider.login!({ apiKey: "key" });

      expect(result.success).toBe(false);
      expect((result as { error: { name: string } }).error.name).toBe("NetworkError");
    });
  });

  describe("logout", () => {
    it("clears token and user from storage", async () => {
      store[TOKEN_KEY] = "some-token";
      store[USER_KEY] = JSON.stringify({ id: "user-1", role: "admin" });

      const result = await authProvider.logout!({});

      expect(result).toEqual({ success: true, redirectTo: "/login" });
      expect(store[TOKEN_KEY]).toBeUndefined();
      expect(store[USER_KEY]).toBeUndefined();
    });
  });

  describe("check", () => {
    it("returns authenticated when token is valid and not expired", async () => {
      const futureExp = Date.now() + 3600_000;
      store[TOKEN_KEY] = makeJwt({ userId: "user-1", role: "admin", exp: futureExp });

      const result = await authProvider.check!({});

      expect(result).toEqual({ authenticated: true });
    });

    it("returns not authenticated when token is expired", async () => {
      const pastExp = Date.now() - 1000;
      store[TOKEN_KEY] = makeJwt({ userId: "user-1", role: "admin", exp: pastExp });

      const result = await authProvider.check!({});

      expect(result).toEqual({ authenticated: false, redirectTo: "/login" });
      expect(store[TOKEN_KEY]).toBeUndefined();
    });

    it("returns not authenticated when no token in storage", async () => {
      const result = await authProvider.check!({});

      expect(result).toEqual({ authenticated: false, redirectTo: "/login" });
    });

    it("returns not authenticated when token is malformed", async () => {
      store[TOKEN_KEY] = "not.a.valid.jwt";

      const result = await authProvider.check!({});

      expect(result).toEqual({ authenticated: false, redirectTo: "/login" });
    });
  });

  describe("getIdentity", () => {
    it("returns user identity from storage", async () => {
      store[USER_KEY] = JSON.stringify({ id: "user-1", role: "admin" });

      const result = await authProvider.getIdentity!({});

      expect(result).toEqual({ id: "user-1", name: "user-1", role: "admin" });
    });

    it("returns null when no user in storage", async () => {
      const result = await authProvider.getIdentity!({});

      expect(result).toBeNull();
    });
  });

  describe("getPermissions", () => {
    it("returns role from storage", async () => {
      store[USER_KEY] = JSON.stringify({ id: "user-1", role: "admin" });

      const result = await authProvider.getPermissions!({});

      expect(result).toBe("admin");
    });

    it("returns null when no user in storage", async () => {
      const result = await authProvider.getPermissions!({});

      expect(result).toBeNull();
    });
  });

  describe("onError", () => {
    it("returns logout true on 401 status", async () => {
      const result = await authProvider.onError!({ statusCode: 401 });

      expect(result).toEqual({ logout: true, redirectTo: "/login" });
    });

    it("returns empty object for non-401 errors", async () => {
      const result = await authProvider.onError!({ statusCode: 500 });

      expect(result).toEqual({});
    });

    it("returns empty object when no status code", async () => {
      const result = await authProvider.onError!({});

      expect(result).toEqual({});
    });
  });
});
