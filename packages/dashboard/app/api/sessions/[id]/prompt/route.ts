import { NextRequest } from "next/server";
import { getAuthenticatedClient } from "@/app/lib/opencode-client";
import { requireAuth, jsonResponse } from "@/app/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { text, model, agent, system } = body;

    if (!text) {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    const client = getAuthenticatedClient(authResult);
    const result = await client.session.promptAsync({
      path: { id },
      body: {
        parts: [{ type: "text", text }],
        model,
        agent,
        system,
      },
    });

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: "Failed to send message" }, 500);
  }
}
