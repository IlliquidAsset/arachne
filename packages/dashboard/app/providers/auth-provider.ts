import type { AuthProvider } from "@refinedev/core";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3100";
const TOKEN_KEY = "arachne_token";
const USER_KEY = "arachne_user";

export const authProvider: AuthProvider = {
  login: async ({ apiKey }: { apiKey: string }) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const json = await res.json();
      if (!json.ok || !json.data?.token) {
        return {
          success: false,
          error: { name: "LoginError", message: json.error || "Invalid API key" },
        };
      }
      localStorage.setItem(TOKEN_KEY, json.data.token);
      localStorage.setItem(
        USER_KEY,
        JSON.stringify({ id: json.data.userId, role: json.data.role })
      );
      return { success: true, redirectTo: "/dashboard" };
    } catch {
      return {
        success: false,
        error: { name: "NetworkError", message: "Cannot reach API server" },
      };
    }
  },

  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { authenticated: false, redirectTo: "/login" };
    // Decode JWT payload to check expiry (base64url middle segment)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        return { authenticated: false, redirectTo: "/login" };
      }
      return { authenticated: true };
    } catch {
      return { authenticated: false, redirectTo: "/login" };
    }
  },

  getIdentity: async () => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      return { id: user.id, name: user.id, role: user.role };
    } catch {
      return null;
    }
  },

  getPermissions: async () => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw).role;
    } catch {
      return null;
    }
  },

  onError: async (error: { statusCode?: number }) => {
    if (error?.statusCode === 401) {
      return { logout: true, redirectTo: "/login" };
    }
    return {};
  },
};
