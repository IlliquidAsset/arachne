import { NextRequest } from "next/server";
import { getAuthenticatedClient } from "@/app/lib/opencode-client";
import { requireAuth, jsonResponse } from "@/app/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const client = getAuthenticatedClient(authResult);
    const result = await client.session.messages({
      path: { id },
      query: limit !== undefined ? { limit } : undefined,
    });

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse(result.data ?? []);
  } catch (error) {
    return jsonResponse({ error: "Failed to get messages" }, 500);
  }
}
