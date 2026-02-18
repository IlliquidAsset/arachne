import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { projectRegistry } from "../discovery"
import { buildAllProfiles, clearProfiles } from "../knowledge"
import { clearContext, getContext, routeMessage } from "./router"

declare const describe: (name: string, fn: () => void | Promise<void>) => void
declare const test: (name: string, fn: () => void | Promise<void>) => void
declare const expect: (value: unknown) => any
declare const beforeAll: (fn: () => void | Promise<void>) => void
declare const beforeEach: (fn: () => void | Promise<void>) => void
declare const afterAll: (fn: () => void | Promise<void>) => void

let tempRoot = ""
let northstarPath = ""
let watserfacePath = ""
let orchestratorPath = ""

async function writeProjectFixtures(): Promise<void> {
  tempRoot = await mkdtemp(join(tmpdir(), "router-test-"))
  northstarPath = join(tempRoot, "northstarpro")
  watserfacePath = join(tempRoot, "watserface")
  orchestratorPath = join(tempRoot, "amanda-orchestrator")

  await Promise.all([
    mkdir(northstarPath, { recursive: true }),
    mkdir(watserfacePath, { recursive: true }),
    mkdir(orchestratorPath, { recursive: true }),
  ])

  await Promise.all([
    writeFile(
      join(northstarPath, "package.json"),
      JSON.stringify({
        name: "northstarpro",
        dependencies: {
          react: "^18.0.0",
        },
      }),
    ),
    writeFile(
      join(watserfacePath, "package.json"),
      JSON.stringify({
        name: "watserface",
        dependencies: {
          three: "^0.1.0",
        },
      }),
    ),
    writeFile(
      join(orchestratorPath, "package.json"),
      JSON.stringify({
        name: "amanda-orchestrator",
      }),
    ),
  ])

  await Promise.all([
    writeFile(
      join(northstarPath, "AGENTS.md"),
      [
        "# NorthstarPro",
        "",
        "Deal workflow platform for CRM and LOI operations.",
        "",
        "## SPDD",
        "",
        "## Personalities",
      ].join("\n"),
    ),
    writeFile(
      join(watserfacePath, "AGENTS.md"),
      [
        "# Watserface",
        "",
        "Rendering pipeline for normal map and SSIM checks.",
        "",
        "## GPU",
        "",
        "RunPod handles distributed rendering jobs.",
      ].join("\n"),
    ),
    writeFile(
      join(orchestratorPath, "AGENTS.md"),
      ["# Amanda Orchestrator", "", "Control plane for Amanda projects."].join(
        "\n",
      ),
    ),
  ])
}

function registerProjects(): void {
  projectRegistry.clear()
  projectRegistry.register({
    id: "northstarpro",
    name: "northstarpro",
    absolutePath: northstarPath,
    detectedFiles: ["package.json"],
    state: "discovered",
  })
  projectRegistry.register({
    id: "watserface",
    name: "watserface",
    absolutePath: watserfacePath,
    detectedFiles: ["package.json"],
    state: "discovered",
  })
  projectRegistry.register({
    id: "amanda-orchestrator",
    name: "amanda-orchestrator",
    absolutePath: orchestratorPath,
    detectedFiles: ["package.json"],
    state: "discovered",
  })
}

beforeAll(async () => {
  await writeProjectFixtures()
})

beforeEach(async () => {
  clearContext()
  registerProjects()

  clearProfiles()
  await buildAllProfiles([
    { id: "northstarpro", absolutePath: northstarPath },
    { id: "watserface", absolutePath: watserfacePath },
    { id: "amanda-orchestrator", absolutePath: orchestratorPath },
  ])
})

afterAll(async () => {
  clearContext()
  clearProfiles()
  projectRegistry.clear()
  await rm(tempRoot, { recursive: true, force: true })
})

describe("routeMessage", () => {
  test("layer 1 explicit preposition match routes to northstarpro", () => {
    const result = routeMessage("In Northstar, check X")
    expect(result.projectId).toBe("northstarpro")
    expect(result.confidence).toBe("explicit")
    expect(result.layer).toBe(1)
  })

  test("layer 1 explicit project phrase routes to watserface", () => {
    const result = routeMessage("on the watserface project, build it")
    expect(result.projectId).toBe("watserface")
    expect(result.confidence).toBe("explicit")
    expect(result.layer).toBe(1)
  })

  test("layer 1 mention routes from @ prefix", () => {
    const result = routeMessage("@northstar what's up")
    expect(result.projectId).toBe("northstarpro")
    expect(result.confidence).toBe("explicit")
    expect(result.layer).toBe(1)
  })

  test("layer 1 strips explicit project reference from message", () => {
    const result = routeMessage("In Northstar, check X")
    expect(result.cleanedMessage).toBe("check X")
  })

  test("layer 2 uses context when follow-up has no explicit project", () => {
    routeMessage("In Northstar, check auth")
    const result = routeMessage("then verify redirects")

    expect(result.projectId).toBe("northstarpro")
    expect(result.confidence).toBe("context")
    expect(result.layer).toBe(2)
  })

  test("layer 2 context expires after 10+ messages without explicit match", () => {
    routeMessage("In Northstar, start session")

    for (let i = 0; i < 9; i += 1) {
      const contextual = routeMessage(`follow up ${i}`)
      expect(contextual.layer).toBe(2)
    }

    const expired = routeMessage("follow up 10")
    expect(expired.layer).toBe(5)
    expect(expired.confidence).toBe("ask_user")
    expect(getContext()).toBeNull()
  })

  test("layer 3 matches project by key concepts", () => {
    const result = routeMessage("check the SPDD personalities")
    expect(result.projectId).toBe("northstarpro")
    expect(result.confidence).toBe("keyword")
    expect(result.layer).toBe(3)
  })

  test("layer 3 matches project by services plus concepts", () => {
    const result = routeMessage("RunPod GPU usage")
    expect(result.projectId).toBe("watserface")
    expect(result.confidence).toBe("keyword")
    expect(result.layer).toBe(3)
  })

  test("layer 3 single keyword match falls through threshold", () => {
    const result = routeMessage("SPDD")
    expect(result.projectId).toBeNull()
    expect(result.confidence).toBe("ask_user")
    expect(result.layer).toBe(5)
  })

  test("layer 5 asks user when no routing signal exists", () => {
    const result = routeMessage("please take care of this soon")

    expect(result.projectId).toBeNull()
    expect(result.confidence).toBe("ask_user")
    expect(result.layer).toBe(5)
    expect(result.candidates).toEqual([
      "amanda-orchestrator",
      "northstarpro",
      "watserface",
    ])
  })
})
