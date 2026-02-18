import { describe, expect, it } from "bun:test";
import {
  getDayType,
  getSeason,
  getTimeOfDay,
  getTimeSinceLastInteraction,
  isHoliday,
} from "../temporal.js";

describe("temporal", () => {
  it("detects morning, afternoon, evening, and night", () => {
    expect(getTimeOfDay(new Date(2026, 1, 17, 10, 0, 0))).toBe("morning");
    expect(getTimeOfDay(new Date(2026, 1, 17, 14, 0, 0))).toBe("afternoon");
    expect(getTimeOfDay(new Date(2026, 1, 17, 19, 0, 0))).toBe("evening");
    expect(getTimeOfDay(new Date(2026, 1, 17, 23, 0, 0))).toBe("night");
  });

  it("detects weekday and weekend", () => {
    expect(getDayType(new Date(2026, 1, 17, 10, 0, 0))).toBe("weekday");
    expect(getDayType(new Date(2026, 1, 14, 10, 0, 0))).toBe("weekend");
  });

  it("detects seasons for Nashville calendar conventions", () => {
    expect(getSeason(new Date(2026, 11, 1, 10, 0, 0))).toBe("winter");
    expect(getSeason(new Date(2026, 6, 1, 10, 0, 0))).toBe("summer");
  });

  it("detects major US holidays", () => {
    const christmas = isHoliday(new Date(2026, 11, 25, 10, 0, 0));
    expect(christmas.isHoliday).toBe(true);
    expect(christmas.name).toBe("Christmas Day");
  });

  it("calculates time since last interaction", () => {
    const originalNow = Date.now;
    Date.now = () => new Date(2026, 1, 17, 12, 0, 0).getTime();

    const result = getTimeSinceLastInteraction(new Date(2026, 1, 17, 9, 30, 0));

    expect(result.minutes).toBe(150);
    expect(result.hours).toBe(2.5);
    expect(result.days).toBeCloseTo(0.104, 3);
    expect(result.humanReadable).toBe("2 hours ago");

    Date.now = originalNow;
  });
});
