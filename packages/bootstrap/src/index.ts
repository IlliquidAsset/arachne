// @arachne/bootstrap - zero-interaction auto-bootstrap engine

export {
  scanEnvironment,
  type EnvScannerDeps,
  type EnvScanResult,
  type ToolInfo,
} from "./env-scanner";

export {
  discoverServices,
  type ServiceDiscoveryDeps,
  type ServiceDiscoveryResult,
  type DiscoveredService,
} from "./service-discovery";

export {
  discoverProjects,
  type ProjectDiscoveryDeps,
  type ProjectDiscoveryResult,
  type DiscoveredProject,
} from "./project-discovery";

export {
  runHealthCheck,
  type HealthCheckDeps,
  type HealthCheckResult,
  type SubsystemCheck,
  type SubsystemStatus,
} from "./health-check";

export {
  bootstrap,
  type BootstrapDeps,
  type BootstrapResult,
  type BootstrapStepResult,
  type BootstrapStepName,
  type SpddAdoptionResult,
} from "./bootstrapper";
