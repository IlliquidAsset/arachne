import { type Relationship, getRelationships } from "./relationships.js";
import {
  type Role,
  detectRole,
  getManualOverride,
} from "./role-detector.js";
import { getDayType, getSeason, getTimeOfDay } from "./temporal.js";

export interface CommanderContext {
  role: Role;
  confidence: number;
  timeOfDay: string;
  dayType: string;
  season: string;
  relationships: Relationship[];
  lastInteraction?: Date;
  manualOverride: Role | null;
}

export interface RoleTransitionRecord {
  from: Role;
  to: Role;
  signals: string[];
  occurredAt: Date;
}

export interface ContextDependencies {
  persistRoleTransition?: (transition: RoleTransitionRecord) => void;
}

interface GetCurrentContextOptions {
  time?: Date;
  activeProject?: string;
}

let contextDependencies: ContextDependencies = {};
let previousRole: Role | null = null;
let previousInteractionTime: Date | undefined;

export function setContextDependencies(deps: ContextDependencies): void {
  contextDependencies = deps;
}

export function recordRoleTransition(from: Role, to: Role, signals: string[]): void {
  const transition: RoleTransitionRecord = {
    from,
    to,
    signals: [...signals],
    occurredAt: new Date(),
  };

  contextDependencies.persistRoleTransition?.(transition);
}

export function getCurrentContext(opts: GetCurrentContextOptions = {}): CommanderContext {
  const now = opts.time ?? new Date();
  const roleDetection = detectRole({
    time: now,
    activeProject: opts.activeProject,
  });

  if (previousRole !== null && previousRole !== roleDetection.role) {
    recordRoleTransition(previousRole, roleDetection.role, roleDetection.signals);
  }

  const context: CommanderContext = {
    role: roleDetection.role,
    confidence: roleDetection.confidence,
    timeOfDay: getTimeOfDay(now),
    dayType: getDayType(now),
    season: getSeason(now),
    relationships: getRelationships(),
    lastInteraction: previousInteractionTime,
    manualOverride: getManualOverride(),
  };

  previousRole = roleDetection.role;
  previousInteractionTime = now;

  return context;
}
