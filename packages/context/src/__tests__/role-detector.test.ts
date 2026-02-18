import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearOverride,
  detectRole,
  getManualOverride,
  setManualOverride,
} from "../role-detector.js";

function getScore(signals: string[], role: string): number | null {
  const signal = signals.find((item) => item.startsWith(`score:${role}=`));
  if (!signal) {
    return null;
  }

  const value = Number(signal.split("=")[1]);
  return Number.isFinite(value) ? value : null;
}

describe("role-detector", () => {
  beforeEach(() => {
    clearOverride();
  });

  it("detects work role at 10am on Tuesday", () => {
    const result = detectRole({
      time: new Date(2026, 1, 17, 10, 0, 0),
    });

    expect(result.role).toBe("work");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("does not prioritize work on 8pm Saturday", () => {
    const result = detectRole({
      time: new Date(2026, 1, 14, 20, 0, 0),
    });
    const workScore = getScore(result.signals, "work");

    expect(result.role).not.toBe("work");
    expect(workScore).not.toBeNull();
    expect(workScore!).toBeLessThan(0.3);
  });

  it("detects dad role on weekday evening", () => {
    const result = detectRole({
      time: new Date(2026, 1, 17, 19, 0, 0),
    });

    expect(result.role).toBe("dad");
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it("boosts dad role when message mentions Scarlett", () => {
    const withoutMessage = detectRole({
      time: new Date(2026, 1, 17, 22, 0, 0),
    });

    const withMessage = detectRole({
      time: new Date(2026, 1, 17, 22, 0, 0),
      messageContent: "Need to pick up Scarlett from dance class",
    });

    const baselineDadScore = getScore(withoutMessage.signals, "dad");
    const boostedDadScore = getScore(withMessage.signals, "dad");

    expect(baselineDadScore).not.toBeNull();
    expect(boostedDadScore).not.toBeNull();
    expect(boostedDadScore!).toBeGreaterThan(baselineDadScore!);
  });

  it("honors manual override", () => {
    setManualOverride("husband");
    const result = detectRole({
      time: new Date(2026, 1, 17, 10, 0, 0),
    });

    expect(getManualOverride()).toBe("husband");
    expect(result.role).toBe("husband");
    expect(result.signals).toContain("manual_override");
  });

  it("clears override and reverts to heuristics", () => {
    setManualOverride("dad");
    clearOverride();

    const result = detectRole({
      time: new Date(2026, 1, 17, 10, 0, 0),
    });

    expect(getManualOverride()).toBeNull();
    expect(result.role).toBe("work");
  });
});
