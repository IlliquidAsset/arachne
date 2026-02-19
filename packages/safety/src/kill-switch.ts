export const DEFAULT_KILL_SWITCH_PATH = "~/.config/arachne/kill-switch"

export interface KillSwitchDependencies {
  fileExists: (path: string) => boolean
  killSwitchPath?: string
}

export function isKillSwitchActive(deps: KillSwitchDependencies): boolean {
  const targetPath = deps.killSwitchPath ?? DEFAULT_KILL_SWITCH_PATH
  return deps.fileExists(targetPath)
}
