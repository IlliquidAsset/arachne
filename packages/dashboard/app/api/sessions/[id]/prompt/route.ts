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
    const { text, parts, model, agent, system } = body;

    // Support both legacy text field and new parts array
    let finalParts: any[];
    if (parts && Array.isArray(parts)) {
      finalParts = parts;
    } else if (text) {
      finalParts = [{ type: "text", text }];
    } else {
      return jsonResponse({ error: "Text or parts is required" }, 400);
    }

    const client = getAuthenticatedClient(authResult);
    const result = await client.session.promptAsync({
      path: { id },
      body: {
        parts: finalParts,
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
