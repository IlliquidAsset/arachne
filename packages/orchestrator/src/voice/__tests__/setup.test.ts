import { describe, expect, test } from "bun:test"
import {
  checkPrerequisites,
  compileWhisperCpp,
  convertCoreMLModel,
  downloadWhisperModel,
  runFullSetup,
  verifyKokoroModel,
  WHISPER_SERVER_BIN,
  WHISPER_MODEL_PATH,
  WHISPER_CPP_DIR,
  type SetupDeps,
  type ExecResult,
} from "../setup"

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

function ok(stdout = ""): ExecResult {
  return { exitCode: 0, stdout, stderr: "" }
}

function fail(stderr = "not found"): ExecResult {
  return { exitCode: 1, stdout: "", stderr }
}

function mockDeps(overrides: Partial<SetupDeps> = {}): SetupDeps {
  return {
    exec: async () => ok(),
    existsSync: () => false,
    mkdirSync: () => {},
    statSync: () => ({ size: 0 }),
    fetch: async () => new Response("ok", { status: 200 }),
    log: () => {},
    ...overrides,
  }
}

/** Creates deps where exec returns different results based on command + args */
function mockDepsWithExecMap(
  execMap: Record<string, ExecResult>,
  overrides: Partial<SetupDeps> = {},
): SetupDeps {
  return mockDeps({
    exec: async (cmd, args) => {
      const key = [cmd, ...args].join(" ")
      // Try exact match first, then command-only match
      if (execMap[key]) return execMap[key]
      if (execMap[cmd]) return execMap[cmd]
      return ok()
    },
    ...overrides,
  })
}

// ===========================================================================
// checkPrerequisites
// ===========================================================================

describe("checkPrerequisites", () => {
  test("returns all tools as available when exec succeeds", async () => {
    const deps = mockDepsWithExecMap({
      "xcode-select -p": ok("/Library/Developer/CommandLineTools"),
      "cmake --version": ok("cmake version 3.28.1"),
      "python3 --version": ok("Python 3.11.5"),
      "git --version": ok("git version 2.43.0"),
    })

    const result = await checkPrerequisites(deps)

    expect(result).toHaveLength(4)
    expect(result.every((r) => r.available)).toBe(true)
    expect(result.find((r) => r.tool.includes("cmake"))?.version).toBe("3.28.1")
    expect(result.find((r) => r.tool.includes("git"))?.version).toBe("2.43.0")
  })

  test("marks cmake as unavailable when exec fails", async () => {
    const deps = mockDepsWithExecMap({
      "xcode-select -p": ok("/Library/Developer/CommandLineTools"),
      "cmake --version": fail("command not found"),
      "python3 --version": ok("Python 3.12.0"),
      "git --version": ok("git version 2.43.0"),
    })

    const result = await checkPrerequisites(deps)
    const cmake = result.find((r) => r.tool === "cmake")

    expect(cmake?.available).toBe(false)
    expect(cmake?.installCmd).toBe("brew install cmake")
  })

  test("marks python as unavailable when version < 3.11", async () => {
    const deps = mockDepsWithExecMap({
      "xcode-select -p": ok("/Library/Developer/CommandLineTools"),
      "cmake --version": ok("cmake version 3.28.1"),
      "python3 --version": ok("Python 3.10.9"),
      "git --version": ok("git version 2.43.0"),
    })

    const result = await checkPrerequisites(deps)
    const python = result.find((r) => r.tool.includes("python3"))

    expect(python?.available).toBe(false)
    expect(python?.version).toBe("3.10.9")
  })

  test("marks Xcode CLT as unavailable when missing", async () => {
    const deps = mockDepsWithExecMap({
      "xcode-select -p": fail("xcode-select: note: no developer tools were found"),
      "cmake --version": ok("cmake version 3.28.1"),
      "python3 --version": ok("Python 3.12.0"),
      "git --version": ok("git version 2.43.0"),
    })

    const result = await checkPrerequisites(deps)
    const xcode = result.find((r) => r.tool.includes("Xcode"))

    expect(xcode?.available).toBe(false)
    expect(xcode?.installCmd).toBe("xcode-select --install")
  })

  test("handles exec throwing an exception gracefully", async () => {
    const deps = mockDeps({
      exec: async (cmd) => {
        if (cmd === "cmake") throw new Error("ENOENT")
        return ok("version 1.0")
      },
    })

    const result = await checkPrerequisites(deps)
    const cmake = result.find((r) => r.tool === "cmake")

    expect(cmake?.available).toBe(false)
  })

  test("accepts python 3.11 exactly as valid", async () => {
    const deps = mockDepsWithExecMap({
      "xcode-select -p": ok("/Library/Developer/CommandLineTools"),
      "cmake --version": ok("cmake version 3.28.1"),
      "python3 --version": ok("Python 3.11.0"),
      "git --version": ok("git version 2.43.0"),
    })

    const result = await checkPrerequisites(deps)
    const python = result.find((r) => r.tool.includes("python3"))

    expect(python?.available).toBe(true)
    expect(python?.version).toBe("3.11.0")
  })
})

// ===========================================================================
// compileWhisperCpp
// ===========================================================================

describe("compileWhisperCpp", () => {
  test("skips compilation when binary already exists and works", async () => {
    const logs: string[] = []
    const deps = mockDeps({
      existsSync: (p) => p === WHISPER_SERVER_BIN,
      exec: async () => ok("whisper-server help output"),
      log: (msg) => logs.push(msg),
    })

    const result = await compileWhisperCpp(deps)

    expect(result.success).toBe(true)
    expect(result.binaryPath).toBe(WHISPER_SERVER_BIN)
    expect(logs.some((m) => m.includes("already compiled"))).toBe(true)
  })

  test("clones, configures, builds, and verifies for fresh compile", async () => {
    const execCalls: string[] = []
    const deps = mockDeps({
      existsSync: () => false,
      exec: async (cmd, args) => {
        execCalls.push([cmd, ...args].join(" "))
        return ok()
      },
    })

    const result = await compileWhisperCpp(deps)

    expect(result.success).toBe(true)
    expect(execCalls.some((c) => c.includes("git clone"))).toBe(true)
    expect(execCalls.some((c) => c.includes("-DWHISPER_COREML=1"))).toBe(true)
    expect(execCalls.some((c) => c.includes("-DWHISPER_METAL=1"))).toBe(true)
    expect(execCalls.some((c) => c.includes("--build build"))).toBe(true)
  })

  test("returns error when git clone fails", async () => {
    const deps = mockDeps({
      existsSync: () => false,
      exec: async (cmd, args) => {
        if (cmd === "git") return fail("fatal: could not clone")
        return ok()
      },
    })

    const result = await compileWhisperCpp(deps)

    expect(result.success).toBe(false)
    expect(result.error).toContain("git clone failed")
  })

  test("returns error when cmake configure fails", async () => {
    const deps = mockDeps({
      existsSync: (p) => p === WHISPER_CPP_DIR, // already cloned
      exec: async (cmd, args) => {
        if (cmd === "cmake" && args.includes("-B")) return fail("cmake error")
        return ok()
      },
    })

    const result = await compileWhisperCpp(deps)

    expect(result.success).toBe(false)
    expect(result.error).toContain("cmake configure failed")
  })

  test("returns error when cmake build fails", async () => {
    const deps = mockDeps({
      existsSync: (p) => p === WHISPER_CPP_DIR,
      exec: async (cmd, args) => {
        if (cmd === "cmake" && args.includes("--build")) return fail("build error")
        return ok()
      },
    })

    const result = await compileWhisperCpp(deps)

    expect(result.success).toBe(false)
    expect(result.error).toContain("cmake build failed")
  })

  test("skips clone when whisper.cpp dir already exists", async () => {
    const execCalls: string[] = []
    const deps = mockDeps({
      existsSync: (p) => p === WHISPER_CPP_DIR, // dir exists, binary doesn't
      exec: async (cmd, args) => {
        execCalls.push([cmd, ...args].join(" "))
        return ok()
      },
    })

    await compileWhisperCpp(deps)

    expect(execCalls.some((c) => c.includes("git clone"))).toBe(false)
  })
})

// ===========================================================================
// downloadWhisperModel
// ===========================================================================

describe("downloadWhisperModel", () => {
  test("skips download when model exists with sufficient size", async () => {
    const logs: string[] = []
    const deps = mockDeps({
      existsSync: (p) => p === WHISPER_MODEL_PATH,
      statSync: () => ({ size: 1_600_000_000 }),
      log: (msg) => logs.push(msg),
    })

    const result = await downloadWhisperModel(deps)

    expect(result.success).toBe(true)
    expect(result.sizeBytes).toBe(1_600_000_000)
    expect(logs.some((m) => m.includes("already exists"))).toBe(true)
  })

  test("re-downloads when model exists but is too small", async () => {
    const modelBuffer = new ArrayBuffer(2_000_000_000)
    const deps = mockDeps({
      existsSync: (p) => p === WHISPER_MODEL_PATH,
      statSync: () => ({ size: 500 }), // too small
      fetch: async () =>
        new Response(modelBuffer, {
          status: 200,
          headers: { "content-length": String(modelBuffer.byteLength) },
        }),
    })

    const result = await downloadWhisperModel(deps)

    expect(result.success).toBe(true)
    expect(result.sizeBytes).toBe(2_000_000_000)
  })

  test("returns error on HTTP failure", async () => {
    const deps = mockDeps({
      fetch: async () => new Response(null, { status: 404, statusText: "Not Found" }),
    })

    const result = await downloadWhisperModel(deps)

    expect(result.success).toBe(false)
    expect(result.error).toContain("404")
  })

  test("creates models directory before download", async () => {
    const mkdirCalls: string[] = []
    const modelBuffer = new ArrayBuffer(1_100_000_000)
    const deps = mockDeps({
      mkdirSync: (path) => mkdirCalls.push(path),
      fetch: async () => new Response(modelBuffer, { status: 200 }),
    })

    await downloadWhisperModel(deps)

    expect(mkdirCalls.some((p) => p.includes("models"))).toBe(true)
  })
})

// ===========================================================================
// convertCoreMLModel
// ===========================================================================

describe("convertCoreMLModel", () => {
  test("succeeds when script exists and exec succeeds", async () => {
    const deps = mockDeps({
      existsSync: () => true,
      exec: async () => ok("conversion complete"),
    })

    const result = await convertCoreMLModel(deps)

    expect(result.success).toBe(true)
  })

  test("returns error when script not found", async () => {
    const deps = mockDeps({
      existsSync: () => false,
    })

    const result = await convertCoreMLModel(deps)

    expect(result.success).toBe(false)
    expect(result.error).toContain("not found")
  })

  test("returns error when conversion script fails", async () => {
    const deps = mockDeps({
      existsSync: () => true,
      exec: async () => fail("conversion error: missing dependencies"),
    })

    const result = await convertCoreMLModel(deps)

    expect(result.success).toBe(false)
    expect(result.error).toContain("CoreML conversion failed")
  })

  test("passes correct arguments to exec", async () => {
    const execCalls: Array<{ cmd: string; args: string[] }> = []
    const deps = mockDeps({
      existsSync: () => true,
      exec: async (cmd, args) => {
        execCalls.push({ cmd, args })
        return ok()
      },
    })

    await convertCoreMLModel(deps)

    const call = execCalls.find((c) => c.cmd === "bash")
    expect(call).toBeDefined()
    expect(call!.args[1]).toBe("large-v3-turbo")
  })
})

// ===========================================================================
// verifyKokoroModel
// ===========================================================================

describe("verifyKokoroModel", () => {
  test("returns success with cachePath when cache directory exists", async () => {
    const deps = mockDeps({
      existsSync: () => true,
    })

    const result = await verifyKokoroModel(deps)

    expect(result.success).toBe(true)
    expect(result.cachePath).toBeDefined()
    expect(result.cachePath).toContain("Kokoro-82M")
  })

  test("returns success without cachePath when cache missing", async () => {
    const deps = mockDeps({
      existsSync: () => false,
    })

    const result = await verifyKokoroModel(deps)

    expect(result.success).toBe(true)
    expect(result.cachePath).toBeUndefined()
  })
})

// ===========================================================================
// runFullSetup
// ===========================================================================

describe("runFullSetup", () => {
  function allPassDeps(): SetupDeps {
    const modelBuffer = new ArrayBuffer(1_500_000_000)

    return mockDeps({
      exec: async (cmd, args) => {
        const key = [cmd, ...args].join(" ")
        if (key.includes("xcode-select")) return ok("/Library/Developer/CommandLineTools")
        if (key.includes("cmake --version")) return ok("cmake version 3.28.1")
        if (key.includes("python3 --version")) return ok("Python 3.12.0")
        if (key.includes("git --version")) return ok("git version 2.43.0")
        return ok()
      },
      existsSync: (p) => {
        // whisper-server binary already compiled
        if (p === WHISPER_SERVER_BIN) return true
        // whisper model already downloaded
        if (p === WHISPER_MODEL_PATH) return true
        // CoreML script exists
        if (p.includes("generate-coreml-model")) return true
        // Kokoro cache exists
        if (p.includes("Kokoro-82M")) return true
        return false
      },
      statSync: () => ({ size: 1_500_000_000 }),
      fetch: async () => new Response(modelBuffer, { status: 200 }),
    })
  }

  test("completes full happy path", async () => {
    const logs: string[] = []
    const deps = { ...allPassDeps(), log: (msg: string) => logs.push(msg) }

    const summary = await runFullSetup(deps)

    expect(summary.success).toBe(true)
    expect(summary.prerequisites).toHaveLength(4)
    expect(summary.compile?.success).toBe(true)
    expect(summary.download?.success).toBe(true)
    expect(summary.kokoro?.success).toBe(true)
    expect(logs.some((m) => m.includes("Setup Complete"))).toBe(true)
  })

  test("stops early when required prerequisite is missing", async () => {
    const deps = mockDeps({
      exec: async (cmd, args) => {
        const key = [cmd, ...args].join(" ")
        if (key.includes("xcode-select")) return ok("/Library/Developer/CommandLineTools")
        if (key.includes("cmake --version")) return fail("not found")
        if (key.includes("python3 --version")) return ok("Python 3.12.0")
        if (key.includes("git --version")) return ok("git version 2.43.0")
        return ok()
      },
    })

    const summary = await runFullSetup(deps)

    expect(summary.success).toBe(false)
    expect(summary.compile).toBeNull()
    expect(summary.download).toBeNull()
  })

  test("skips CoreML when python is unavailable", async () => {
    const logs: string[] = []
    const deps = {
      ...allPassDeps(),
      exec: async (cmd: string, args: string[]) => {
        const key = [cmd, ...args].join(" ")
        if (key.includes("xcode-select")) return ok("/Library/Developer/CommandLineTools")
        if (key.includes("cmake --version")) return ok("cmake version 3.28.1")
        if (key.includes("python3 --version")) return ok("Python 3.9.0") // too old
        if (key.includes("git --version")) return ok("git version 2.43.0")
        return ok()
      },
      log: (msg: string) => logs.push(msg),
    }

    const summary = await runFullSetup(deps)

    expect(summary.success).toBe(true)
    expect(summary.coreml?.success).toBe(false)
    expect(summary.coreml?.error).toContain("Python 3.11+")
    expect(logs.some((m) => m.includes("Skipping CoreML"))).toBe(true)
  })

  test("continues after non-fatal CoreML failure", async () => {
    const deps = mockDeps({
      exec: async (cmd, args) => {
        const key = [cmd, ...args].join(" ")
        if (key.includes("xcode-select")) return ok("/Library/Developer/CommandLineTools")
        if (key.includes("cmake --version")) return ok("cmake version 3.28.1")
        if (key.includes("python3 --version")) return ok("Python 3.12.0")
        if (key.includes("git --version")) return ok("git version 2.43.0")
        if (cmd === "bash") return fail("coreml script error")
        return ok()
      },
      existsSync: (p) => {
        if (p === WHISPER_SERVER_BIN) return true
        if (p === WHISPER_MODEL_PATH) return true
        if (p.includes("generate-coreml-model")) return true
        if (p.includes("Kokoro-82M")) return true
        return false
      },
      statSync: () => ({ size: 1_500_000_000 }),
    })

    const summary = await runFullSetup(deps)

    expect(summary.success).toBe(true)
    expect(summary.coreml?.success).toBe(false)
    expect(summary.kokoro?.success).toBe(true)
  })

  test("logs disk usage in summary", async () => {
    const logs: string[] = []
    const deps = { ...allPassDeps(), log: (msg: string) => logs.push(msg) }

    await runFullSetup(deps)

    expect(logs.some((m) => m.includes("Whisper binary:"))).toBe(true)
    expect(logs.some((m) => m.includes("Whisper model:"))).toBe(true)
  })
})
