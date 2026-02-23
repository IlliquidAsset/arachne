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
    const client = getAuthenticatedClient(authResult);
    const result = await client.session.abort({ path: { id } });

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: "Failed to abort session" }, 500);
  }
}
