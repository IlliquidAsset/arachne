import { beforeEach, describe, expect, it } from "bun:test";
import { clearOverride, setManualOverride } from "../role-detector.js";
import {
  getCurrentContext,
  recordRoleTransition,
  setContextDependencies,
  type RoleTransitionRecord,
} from "../context-engine.js";

describe("context-engine", () => {
  beforeEach(() => {
    clearOverride();
    setContextDependencies({});
  });

  it("returns a unified current context object", () => {
    const context = getCurrentContext({
      time: new Date(2026, 1, 17, 10, 0, 0),
      activeProject: "arachne",
    });

    expect(context.role).toBe("work");
    expect(context.confidence).toBeGreaterThan(0.7);
    expect(context.timeOfDay).toBe("morning");
    expect(context.dayType).toBe("weekday");
    expect(context.season).toBe("winter");
    expect(Array.isArray(context.relationships)).toBe(true);
    expect(context.relationships.length).toBeGreaterThanOrEqual(2);
    expect(context.manualOverride).toBeNull();
  });

  it("records role transitions through dependency injection", () => {
    const transitions: RoleTransitionRecord[] = [];

    setContextDependencies({
      persistRoleTransition(transition) {
        transitions.push(transition);
      },
    });

    recordRoleTransition("general", "work", ["weekday_work_hours"]);

    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({
      from: "general",
      to: "work",
      signals: ["weekday_work_hours"],
    });
    expect(transitions[0].occurredAt).toBeInstanceOf(Date);
  });

  it("reflects manual override in context", () => {
    setManualOverride("dad");

    const context = getCurrentContext({
      time: new Date(2026, 1, 17, 10, 0, 0),
    });

    expect(context.role).toBe("dad");
    expect(context.manualOverride).toBe("dad");
  });
});
