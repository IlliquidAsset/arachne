import { join } from "node:path";

export interface ProjectDiscoveryDeps {
  homeDir: string;
  existsSync: (path: string) => boolean;
  readDir: (path: string) => string[];
  isDirectory: (path: string) => boolean;
}

export interface DiscoveredProject {
  name: string;
  path: string;
  hasOpencode: boolean;
  hasGit: boolean;
}

export interface ProjectDiscoveryResult {
  devDir: string;
  projects: DiscoveredProject[];
  timestamp: string;
}

function isGitRepo(projectPath: string, deps: ProjectDiscoveryDeps): boolean {
  return deps.existsSync(join(projectPath, ".git"));
}

function hasOpencodeDir(projectPath: string, deps: ProjectDiscoveryDeps): boolean {
  return deps.existsSync(join(projectPath, ".opencode"));
}

export function discoverProjects(deps: ProjectDiscoveryDeps): ProjectDiscoveryResult {
  const devDir = join(deps.homeDir, "Documents", "dev");

  if (!deps.existsSync(devDir)) {
    return { devDir, projects: [], timestamp: new Date().toISOString() };
  }

  let entries: string[];
  try {
    entries = deps.readDir(devDir);
  } catch {
    return { devDir, projects: [], timestamp: new Date().toISOString() };
  }

  const projects: DiscoveredProject[] = [];

  for (const entry of entries) {
    const fullPath = join(devDir, entry);

    if (!deps.isDirectory(fullPath)) {
      continue;
    }

    const hasGit = isGitRepo(fullPath, deps);

    if (hasGit) {
      projects.push({
        name: entry,
        path: fullPath,
        hasOpencode: hasOpencodeDir(fullPath, deps),
        hasGit: true,
      });
    }
  }

  return {
    devDir,
    projects,
    timestamp: new Date().toISOString(),
  };
}
