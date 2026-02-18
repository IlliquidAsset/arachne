export interface WhisperConfig {
  binaryPath: string // path to whisper-server binary
  modelPath: string // path to GGML model file
  serverPort: number // port for whisper HTTP server
  language: string // language code
  useCoreML: boolean // whether to use Core ML acceleration
}

export type WhisperStatus = "stopped" | "starting" | "running" | "error"

interface SpawnOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
}

export interface SpawnedProcess {
  pid: number | null
  kill(signal?: NodeJS.Signals | number): boolean | void
  exited: Promise<number | null>
}

export type SpawnProcess = (
  command: string[],
  options: SpawnOptions,
) => SpawnedProcess

export interface WhisperLifecycleDependencies {
  fetchFn?: typeof fetch
  spawnProcess?: SpawnProcess
  sleep?: (ms: number) => Promise<void>
  signalProcess?: (pid: number, signal: NodeJS.Signals) => boolean
}
