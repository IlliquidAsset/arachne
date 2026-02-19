import type { DataProvider } from "@refinedev/core";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3100";

const RESOURCE_PATHS: Record<string, string> = {
  tasks: "/api/tasks",
  services: "/api/services",
  skills: "/api/skills",
  budget: "/api/budget/summary",
};

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("arachne_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!json.ok) return null;
    return json.data as T;
  } catch {
    return null;
  }
}

export const dataProvider: DataProvider = {
  getList: async ({ resource }) => {
    const path = RESOURCE_PATHS[resource];
    if (!path) {
      return { data: [], total: 0 };
    }

    const result = await apiFetch<unknown>(path);
    if (result === null) {
      return { data: [], total: 0 };
    }

    // Budget is special — API returns single object, wrap in array
    if (resource === "budget") {
      return { data: [result], total: 1 };
    }

    // For other resources, expect array
    if (Array.isArray(result)) {
      return { data: result, total: result.length };
    }

    return { data: [], total: 0 };
  },

  getOne: async ({ resource }) => {
    let path = "";

    if (resource === "context") {
      path = "/api/context";
    } else if (resource === "health") {
      path = "/api/health";
    } else {
      return { data: {} as never };
    }

    const result = await apiFetch<unknown>(path);
    if (result === null) {
      return { data: {} as never };
    }

    return { data: result as never };
  },

  create: async () => {
    throw new Error("Not implemented — read-only dashboard");
  },

  update: async () => {
    throw new Error("Not implemented — read-only dashboard");
  },

  deleteOne: async () => {
    throw new Error("Not implemented — read-only dashboard");
  },

  getApiUrl: () => API_URL,
};
