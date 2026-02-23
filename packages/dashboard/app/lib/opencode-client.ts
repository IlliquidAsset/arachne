import { createOpencodeClient } from "@opencode-ai/sdk";
import type { OpencodeClient } from "@opencode-ai/sdk";

const OPENCODE_API_URL = process.env.OPENCODE_API_URL || "http://localhost:4096";

export function getAuthenticatedClient(password: string): OpencodeClient {
  const authHeader = `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`;

  const client = createOpencodeClient({
    baseUrl: OPENCODE_API_URL,
    headers: {
      Authorization: authHeader,
    },
  });

  return client;
}

export function getUnauthenticatedClient(): OpencodeClient {
  return createOpencodeClient({
    baseUrl: OPENCODE_API_URL,
  });
}
