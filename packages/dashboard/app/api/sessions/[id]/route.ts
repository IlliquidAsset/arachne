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
    const client = getAuthenticatedClient(authResult);
    const result = await client.session.get({ path: { id } });

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse(result.data);
  } catch (error) {
    return jsonResponse({ error: "Failed to get session" }, 500);
  }
}

export async function DELETE(
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
    const result = await client.session.delete({ path: { id } });

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: "Failed to delete session" }, 500);
  }
}
