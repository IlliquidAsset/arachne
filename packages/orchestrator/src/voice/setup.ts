import { existsSync, mkdirSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { cpus } from "node:os"
import { join } from "node:path"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExecResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface SetupDeps {
  exec(cmd: string, args: string[], opts?: { cwd?: string }): Promise<ExecResult>
  existsSync(path: string): boolean
  mkdirSync(path: string, opts?: { recursive?: boolean }): void
  statSync(path: string): { size: number }
  fetch(url: string, opts?: RequestInit): Promise<Response>
  log(msg: string): void
}

export interface PrerequisiteStatus {
  tool: string
  available: boolean
  version?: string
  installCmd?: string
}

export interface CompileResult {
  success: boolean
  binaryPath: string
  error?: string
}

export interface DownloadResult {
  success: boolean
  path: string
  sizeBytes: number
  error?: string
}

export interface ConvertResult {
  success: boolean
  error?: string
}

export interface VerifyResult {
  success: boolean
  cachePath?: string
  error?: string
}

export interface SetupSummary {
  prerequisites: PrerequisiteStatus[]
  compile: CompileResult | null
  download: DownloadResult | null
  coreml: ConvertResult | null
  kokoro: VerifyResult | null
  success: boolean
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const CONFIG_DIR = join(homedir(), ".config", "arachne")
const WHISPER_CPP_DIR = join(CONFIG_DIR, "whisper.cpp")
const WHISPER_SERVER_BIN = join(WHISPER_CPP_DIR, "build", "bin", "whisper-server")
const MODELS_DIR = join(CONFIG_DIR, "models")
const WHISPER_MODEL_PATH = join(MODELS_DIR, "ggml-large-v3-turbo.bin")
const WHISPER_MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin"
const WHISPER_REPO_URL = "https://github.com/ggml-org/whisper.cpp"

/** Minimum acceptable model size: 1 GB */
const MIN_MODEL_SIZE = 1_000_000_000

export {
  CONFIG_DIR,
  WHISPER_CPP_DIR,
  WHISPER_SERVER_BIN,
  MODELS_DIR,
  WHISPER_MODEL_PATH,
  WHISPER_MODEL_URL,
  WHISPER_REPO_URL,
  MIN_MODEL_SIZE,
}

// ---------------------------------------------------------------------------
// Default deps (real implementations)
// ---------------------------------------------------------------------------

async function defaultExec(
  cmd: string,
  args: string[],
  opts?: { cwd?: string },
): Promise<ExecResult> {
  const proc = Bun.spawn([cmd, ...args], {
    cwd: opts?.cwd,
    stdout: "pipe",
    stderr: "pipe",
  })

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])

  const exitCode = await proc.exited
  return { exitCode, stdout, stderr }
}

export function createDefaultDeps(): SetupDeps {
  return {
    exec: defaultExec,
    existsSync,
    mkdirSync,
    statSync: (path: string) => {
      const s = statSync(path)
      return { size: s.size }
    },
    fetch: globalThis.fetch,
    log: (msg: string) => console.log(msg),
  }
}

// ---------------------------------------------------------------------------
// checkPrerequisites
// ---------------------------------------------------------------------------

function parseVersion(raw: string): string {
  const match = raw.match(/(\d+\.\d+(?:\.\d+)?)/)
  return match?.[1] ?? ""
}

function parsePythonMajorMinor(versionStr: string): [number, number] | null {
  const match = versionStr.match(/(\d+)\.(\d+)/)
  if (!match) return null
  return [Number(match[1]), Number(match[2])]
}

export async function checkPrerequisites(deps: SetupDeps): Promise<PrerequisiteStatus[]> {
  const results: PrerequisiteStatus[] = []

  // Xcode Command Line Tools
  try {
    const r = await deps.exec("xcode-select", ["-p"])
    results.push({
      tool: "Xcode Command Line Tools",
      available: r.exitCode === 0,
      version: r.stdout.trim(),
      installCmd: "xcode-select --install",
    })
  } catch {
    results.push({
      tool: "Xcode Command Line Tools",
      available: false,
      installCmd: "xcode-select --install",
    })
  }

  // cmake
  try {
    const r = await deps.exec("cmake", ["--version"])
    results.push({
      tool: "cmake",
      available: r.exitCode === 0,
      version: parseVersion(r.stdout),
      installCmd: "brew install cmake",
    })
  } catch {
    results.push({
      tool: "cmake",
      available: false,
      installCmd: "brew install cmake",
    })
  }

  // Python 3.11+ (optional — needed for CoreML conversion only)
  try {
    const r = await deps.exec("python3", ["--version"])
    const version = parseVersion(r.stdout + r.stderr)
    const parsed = parsePythonMajorMinor(version)
    const available = r.exitCode === 0 && parsed !== null && (parsed[0] > 3 || (parsed[0] === 3 && parsed[1] >= 11))
    results.push({
      tool: "python3 (>=3.11, optional for CoreML)",
      available,
      version,
      installCmd: "brew install python@3.11",
    })
  } catch {
    results.push({
      tool: "python3 (>=3.11, optional for CoreML)",
      available: false,
      installCmd: "brew install python@3.11",
    })
  }

  // git
  try {
    const r = await deps.exec("git", ["--version"])
    results.push({
      tool: "git",
      available: r.exitCode === 0,
      version: parseVersion(r.stdout),
      installCmd: "brew install git",
    })
  } catch {
    results.push({
      tool: "git",
      available: false,
      installCmd: "brew install git",
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// compileWhisperCpp
// ---------------------------------------------------------------------------

export async function compileWhisperCpp(deps: SetupDeps): Promise<CompileResult> {
  // Already compiled?
  if (deps.existsSync(WHISPER_SERVER_BIN)) {
    try {
      const r = await deps.exec(WHISPER_SERVER_BIN, ["--help"])
      if (r.exitCode === 0) {
        deps.log("whisper-server already compiled, skipping.")
        return { success: true, binaryPath: WHISPER_SERVER_BIN }
      }
    } catch {
      // Binary exists but broken — recompile
    }
  }

  try {
    // Ensure config dir exists
    deps.mkdirSync(CONFIG_DIR, { recursive: true })

    // Clone if needed
    if (!deps.existsSync(WHISPER_CPP_DIR)) {
      deps.log("Cloning whisper.cpp...")
      const clone = await deps.exec("git", ["clone", WHISPER_REPO_URL, WHISPER_CPP_DIR])
      if (clone.exitCode !== 0) {
        return { success: false, binaryPath: WHISPER_SERVER_BIN, error: `git clone failed: ${clone.stderr}` }
      }
    }

    // cmake configure
    deps.log("Configuring whisper.cpp build (CoreML + Metal)...")
    const configure = await deps.exec(
      "cmake",
      ["-B", "build", "-DWHISPER_COREML=1", "-DWHISPER_METAL=1"],
      { cwd: WHISPER_CPP_DIR },
    )
    if (configure.exitCode !== 0) {
      return { success: false, binaryPath: WHISPER_SERVER_BIN, error: `cmake configure failed: ${configure.stderr}` }
    }

    // cmake build
    const cpuCount = cpus().length || 4
    deps.log(`Building whisper.cpp with ${cpuCount} threads...`)
    const build = await deps.exec(
      "cmake",
      ["--build", "build", "--config", "Release", "-j", String(cpuCount)],
      { cwd: WHISPER_CPP_DIR },
    )
    if (build.exitCode !== 0) {
      return { success: false, binaryPath: WHISPER_SERVER_BIN, error: `cmake build failed: ${build.stderr}` }
    }

    // Verify
    const verify = await deps.exec(WHISPER_SERVER_BIN, ["--help"])
    if (verify.exitCode !== 0) {
      return { success: false, binaryPath: WHISPER_SERVER_BIN, error: "Build succeeded but binary verification failed" }
    }

    deps.log("whisper-server compiled successfully.")
    return { success: true, binaryPath: WHISPER_SERVER_BIN }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, binaryPath: WHISPER_SERVER_BIN, error: message }
  }
}

// ---------------------------------------------------------------------------
// downloadWhisperModel
// ---------------------------------------------------------------------------

export async function downloadWhisperModel(deps: SetupDeps): Promise<DownloadResult> {
  // Already downloaded?
  if (deps.existsSync(WHISPER_MODEL_PATH)) {
    try {
      const stat = deps.statSync(WHISPER_MODEL_PATH)
      if (stat.size > MIN_MODEL_SIZE) {
        deps.log(`Whisper model already exists (${(stat.size / 1e9).toFixed(2)} GB), skipping.`)
        return { success: true, path: WHISPER_MODEL_PATH, sizeBytes: stat.size }
      }
    } catch {
      // Corrupt / unreadable — re-download
    }
  }

  try {
    deps.mkdirSync(MODELS_DIR, { recursive: true })

    deps.log("Downloading whisper model (ggml-large-v3-turbo)...")
    deps.log(`  URL: ${WHISPER_MODEL_URL}`)

    const response = await deps.fetch(WHISPER_MODEL_URL)
    if (!response.ok) {
      return {
        success: false,
        path: WHISPER_MODEL_PATH,
        sizeBytes: 0,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0)
    if (contentLength > 0) {
      deps.log(`  Size: ${(contentLength / 1e9).toFixed(2)} GB`)
    }

    const body = response.body
    if (!body) {
      return { success: false, path: WHISPER_MODEL_PATH, sizeBytes: 0, error: "Response body is null" }
    }

    // Stream to file using Bun.write or collect buffer
    const buffer = await response.arrayBuffer()
    const sizeBytes = buffer.byteLength

    // Write via deps.exec + a temp approach — but since we have fs deps, use Bun.write pattern
    // Actually we write via the available deps. We'll add a writeFile to handle this.
    // For simplicity, use Bun.write directly since this is a setup script meant to run with Bun.
    await Bun.write(WHISPER_MODEL_PATH, buffer)

    deps.log(`Download complete: ${(sizeBytes / 1e9).toFixed(2)} GB`)
    return { success: true, path: WHISPER_MODEL_PATH, sizeBytes }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, path: WHISPER_MODEL_PATH, sizeBytes: 0, error: message }
  }
}

// ---------------------------------------------------------------------------
// convertCoreMLModel
// ---------------------------------------------------------------------------

export async function convertCoreMLModel(deps: SetupDeps): Promise<ConvertResult> {
  const scriptPath = join(WHISPER_CPP_DIR, "models", "generate-coreml-model.sh")

  if (!deps.existsSync(scriptPath)) {
    return { success: false, error: "generate-coreml-model.sh not found. Compile whisper.cpp first." }
  }

  try {
    deps.log("Converting CoreML model (this may take 30-60 minutes)...")
    deps.log("  Running: generate-coreml-model.sh large-v3-turbo")

    const result = await deps.exec("bash", [scriptPath, "large-v3-turbo"], {
      cwd: join(WHISPER_CPP_DIR, "models"),
    })

    if (result.exitCode !== 0) {
      return { success: false, error: `CoreML conversion failed: ${result.stderr}` }
    }

    deps.log("CoreML model conversion complete.")
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// verifyKokoroModel
// ---------------------------------------------------------------------------

export async function verifyKokoroModel(deps: SetupDeps): Promise<VerifyResult> {
  // HuggingFace cache lives under ~/.cache/huggingface/hub/
  const hfCacheDir = join(homedir(), ".cache", "huggingface", "hub")
  const kokoroCachePattern = "models--onnx-community--Kokoro-82M-v1.0-ONNX"
  const expectedCachePath = join(hfCacheDir, kokoroCachePattern)

  if (deps.existsSync(expectedCachePath)) {
    deps.log("Kokoro TTS model cache found.")
    return { success: true, cachePath: expectedCachePath }
  }

  deps.log("Kokoro TTS model not cached. It will be downloaded on first TTS use.")
  deps.log("  Model: onnx-community/Kokoro-82M-v1.0-ONNX (auto-cached by HuggingFace)")

  return { success: true, cachePath: undefined }
}

// ---------------------------------------------------------------------------
// runFullSetup
// ---------------------------------------------------------------------------

export async function runFullSetup(deps: SetupDeps): Promise<SetupSummary> {
  const summary: SetupSummary = {
    prerequisites: [],
    compile: null,
    download: null,
    coreml: null,
    kokoro: null,
    success: false,
  }

  deps.log("=== Arachne Voice Pipeline Setup ===\n")

  // Step 1: Prerequisites
  deps.log("Step 1/5: Checking prerequisites...")
  summary.prerequisites = await checkPrerequisites(deps)

  const required = summary.prerequisites.filter(
    (p) => !p.tool.includes("optional"),
  )
  const missing = required.filter((p) => !p.available)

  for (const p of summary.prerequisites) {
    const icon = p.available ? "✓" : "✗"
    const ver = p.version ? ` (${p.version})` : ""
    deps.log(`  ${icon} ${p.tool}${ver}`)
  }

  if (missing.length > 0) {
    deps.log("\nMissing required prerequisites:")
    for (const m of missing) {
      deps.log(`  → Install with: ${m.installCmd}`)
    }
    return summary
  }
  deps.log("")

  // Step 2: Compile whisper.cpp
  deps.log("Step 2/5: Compiling whisper.cpp...")
  summary.compile = await compileWhisperCpp(deps)
  if (!summary.compile.success) {
    deps.log(`  ✗ Compilation failed: ${summary.compile.error}`)
    return summary
  }
  deps.log(`  ✓ Binary: ${summary.compile.binaryPath}\n`)

  // Step 3: Download whisper model
  deps.log("Step 3/5: Downloading whisper model...")
  summary.download = await downloadWhisperModel(deps)
  if (!summary.download.success) {
    deps.log(`  ✗ Download failed: ${summary.download.error}`)
    return summary
  }
  deps.log(`  ✓ Model: ${summary.download.path} (${(summary.download.sizeBytes / 1e9).toFixed(2)} GB)\n`)

  // Step 4: CoreML conversion (optional)
  const pythonAvailable = summary.prerequisites.find(
    (p) => p.tool.includes("python3"),
  )?.available
  if (pythonAvailable) {
    deps.log("Step 4/5: Converting CoreML model...")
    summary.coreml = await convertCoreMLModel(deps)
    if (!summary.coreml.success) {
      deps.log(`  ⚠ CoreML conversion failed (non-fatal): ${summary.coreml.error}`)
    } else {
      deps.log("  ✓ CoreML model ready\n")
    }
  } else {
    deps.log("Step 4/5: Skipping CoreML conversion (Python 3.11+ not available)\n")
    summary.coreml = { success: false, error: "Python 3.11+ not available" }
  }

  // Step 5: Verify Kokoro
  deps.log("Step 5/5: Verifying Kokoro TTS model...")
  summary.kokoro = await verifyKokoroModel(deps)
  if (summary.kokoro.cachePath) {
    deps.log(`  ✓ Cached at: ${summary.kokoro.cachePath}\n`)
  } else {
    deps.log("  ⚠ Will download on first use\n")
  }

  summary.success = true

  // Summary
  deps.log("=== Setup Complete ===")
  deps.log(`  Whisper binary: ${summary.compile.binaryPath}`)
  deps.log(`  Whisper model:  ${summary.download.path}`)
  deps.log(`  CoreML:         ${summary.coreml?.success ? "ready" : "skipped"}`)
  deps.log(`  Kokoro TTS:     ${summary.kokoro.cachePath ? "cached" : "will download on first use"}`)

  return summary
}
