import { NextRequest } from "next/server";
import { getAuthenticatedClient } from "@/app/lib/opencode-client";
import { requireAuth } from "@/app/lib/api-helpers";

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const directory = searchParams.get("directory");

    if (!directory) {
      return new Response(
        JSON.stringify({ error: "Directory parameter is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = getAuthenticatedClient(authResult);
    const result = await client.event.subscribe({ query: { directory } });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of result.stream) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to subscribe to events" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
