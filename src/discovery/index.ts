export { scanProjects } from "./scanner"
export { ProjectRegistry } from "./registry"
export { startWatching } from "./watcher"
export type { WatcherChangeEvent, WatcherCallback } from "./watcher"
export {
  OC_SIGNALS,
  WEAK_SIGNALS,
  DEFAULT_IGNORE,
} from "./types"
export type {
  ProjectInfo,
  ProjectState,
  DetectionSignal,
  ProjectChangeEvent,
  OnChangeCallback,
} from "./types"
