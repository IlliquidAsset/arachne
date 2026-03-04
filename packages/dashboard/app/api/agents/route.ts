import { NextRequest } from "next/server";
import { jsonResponse, requireAuth } from "@/app/lib/api-helpers";

/**
 * Agent roster — mirrored from @arachne/autonomy to avoid cross-package import issues.
 * These are the canonical agents in the Arachne system.
 */
const AGENTS = [
  { name: "sisyphus", specialty: "execution and implementation" },
  { name: "prometheus", specialty: "planning and strategy" },
  { name: "hephaestus", specialty: "build and infrastructure" },
  { name: "atlas", specialty: "knowledge management" },
  { name: "oracle", specialty: "strategic evaluation" },
  { name: "muse", specialty: "creative and divergent thinking" },
  { name: "devils-advocate", specialty: "critical analysis" },
  { name: "metis", specialty: "gap analysis" },
  { name: "momus", specialty: "verification and review" },
  { name: "explore", specialty: "codebase investigation" },
  { name: "librarian", specialty: "external research" },
  { name: "headhunter", specialty: "job search and career strategy" },
];

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  return jsonResponse({ agents: AGENTS });
}
