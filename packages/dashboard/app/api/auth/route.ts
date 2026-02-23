import { NextRequest } from "next/server";
import { getAuthenticatedClient } from "@/app/lib/opencode-client";
import { jsonResponse, setAuthCookie, getAuthFromCookie } from "@/app/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return jsonResponse({ error: "Password is required" }, 400);
    }

    // Defense-in-depth: validate against env var if set
    const serverPassword = process.env.OPENCODE_SERVER_PASSWORD;
    if (serverPassword && password !== serverPassword) {
      return jsonResponse({ error: "Invalid password" }, 401);
    }

    const client = getAuthenticatedClient(password);
    const result = await client.session.list();

    if (result.error) {
      return jsonResponse({ error: "Invalid password" }, 401);
    }

    return setAuthCookie(password);
  } catch (error) {
    return jsonResponse({ error: "Authentication failed" }, 401);
  }
}

export async function GET(request: NextRequest) {
  const password = getAuthFromCookie(request);
  return jsonResponse({ authenticated: !!password });
}
