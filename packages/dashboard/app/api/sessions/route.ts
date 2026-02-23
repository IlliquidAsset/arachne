import { NextRequest } from "next/server";
import { getAuthenticatedClient } from "@/app/lib/opencode-client";
import { requireAuth, jsonResponse } from "@/app/lib/api-helpers";

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const client = getAuthenticatedClient(authResult);
    const result = await client.session.list();

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse(result.data ?? []);
  } catch (error) {
    return jsonResponse({ error: "Failed to list sessions" }, 500);
  }
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { title } = body;

    const client = getAuthenticatedClient(authResult);
    const result = await client.session.create({ body: { title } });

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse(result.data);
  } catch (error) {
    return jsonResponse({ error: "Failed to create session" }, 500);
  }
}
