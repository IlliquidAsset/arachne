import { describe, it, expect } from "bun:test";
import {
  createTokenRibbonData,
  formatCost,
  formatTokenCount,
  getUsageLevel,
} from "@arachne/web/src/components/TokenRibbon";
import {
  createServiceGridData,
  formatLastChecked,
  mapStatusToColor,
} from "@arachne/web/src/components/ServiceStatus";
import {
  createActiveTasksData,
  filterTasks,
  formatDuration,
  getStatusIcon,
} from "@arachne/web/src/components/ActiveTasks";
import {
  createBudgetOverview,
  trendToSvgPath,
  formatUsd,
  determineAlertLevel,
} from "@arachne/web/src/components/BudgetSummary";
import type { SpendingSummary, TaskInfo, ServiceInfo } from "@arachne/web/src/api/types";

const MOCK_SUMMARY: SpendingSummary = {
  totalUsd: 12.5,
  byProvider: {
    anthropic: { tokensIn: 500000, tokensOut: 200000, costUsd: 8.0 },
    xai: { tokensIn: 100000, tokensOut: 50000, costUsd: 4.5 },
  },
  byProject: { main: 12.5 },
  period: "day",
};

const MOCK_SERVICES: ServiceInfo[] = [
  { name: "Orchestrator", type: "core", status: "active", url: "http://localhost:3100", lastChecked: new Date().toISOString() },
  { name: "Voice", type: "voice", status: "degraded", url: "ws://localhost:3200", lastChecked: new Date().toISOString() },
  { name: "Whisper", type: "stt", status: "offline", url: "http://localhost:3300", lastChecked: new Date(Date.now() - 600000).toISOString() },
];

const MOCK_TASKS: TaskInfo[] = [
  { id: "1", name: "Build dashboard", status: "running", track: "llm", project: "arachne", startedAt: new Date().toISOString(), duration: 45000 },
  { id: "2", name: "Update guard", status: "queued", track: "deterministic", project: "arachne", startedAt: new Date().toISOString(), duration: 0 },
  { id: "3", name: "Voice test", status: "completed", track: "llm", project: "voice", startedAt: new Date().toISOString(), duration: 120000 },
  { id: "4", name: "Failed deploy", status: "failed", track: "deterministic", project: "deploy", startedAt: new Date().toISOString(), duration: 5000 },
];

describe("TokenRibbon panel data", () => {
  it("creates ribbon data from summary", () => {
    const data = createTokenRibbonData(MOCK_SUMMARY);
    expect(data.totalCostUsd).toBe(12.5);
    expect(data.providers.length).toBe(2);
  });

  it("handles null summary gracefully", () => {
    const data = createTokenRibbonData(null);
    expect(data.totalCostUsd).toBe(0);
    expect(data.providers).toEqual([]);
  });

  it("formats cost as USD", () => {
    expect(formatCost(12.5)).toBe("$12.50");
    expect(formatCost(0)).toBe("$0.00");
  });

  it("formats token counts with M/K suffixes", () => {
    expect(formatTokenCount(1500000)).toBe("1.5M");
    expect(formatTokenCount(50000)).toBe("50.0K");
    expect(formatTokenCount(500)).toBe("500");
  });

  it("returns correct usage levels", () => {
    expect(getUsageLevel(90)).toBe("red");
    expect(getUsageLevel(70)).toBe("yellow");
    expect(getUsageLevel(50)).toBe("green");
  });

  it("respects collapsed flag", () => {
    const data = createTokenRibbonData(MOCK_SUMMARY, true);
    expect(data.collapsed).toBe(true);
  });
});

describe("ServiceStatus panel data", () => {
  it("creates grid data from services", () => {
    const grid = createServiceGridData(MOCK_SERVICES);
    expect(grid.totalCount).toBe(3);
    expect(grid.services.length).toBe(3);
  });

  it("counts active and offline services", () => {
    const grid = createServiceGridData(MOCK_SERVICES);
    expect(grid.activeCount).toBe(1);
    expect(grid.offlineCount).toBeGreaterThanOrEqual(1);
  });

  it("maps status to colors", () => {
    expect(mapStatusToColor("active")).toBe("green");
    expect(mapStatusToColor("degraded")).toBe("yellow");
    expect(mapStatusToColor("offline")).toBe("red");
    expect(mapStatusToColor("unknown")).toBe("grey");
  });

  it("formats recent timestamps", () => {
    const now = Date.now();
    expect(formatLastChecked(new Date(now - 30000).toISOString(), now)).toBe("30s ago");
    expect(formatLastChecked(new Date(now - 120000).toISOString(), now)).toBe("2m ago");
  });

  it("handles invalid timestamps", () => {
    expect(formatLastChecked("invalid")).toBe("never");
  });

  it("handles empty services array", () => {
    const grid = createServiceGridData([]);
    expect(grid.totalCount).toBe(0);
    expect(grid.services).toEqual([]);
  });
});

describe("ActiveTasks panel data", () => {
  it("creates tasks data with all filters", () => {
    const data = createActiveTasksData(MOCK_TASKS);
    expect(data.totalCount).toBe(4);
    expect(data.tasks.length).toBe(4);
    expect(data.filter).toBe("all");
  });

  it("counts running tasks", () => {
    const data = createActiveTasksData(MOCK_TASKS);
    expect(data.runningCount).toBe(1);
  });

  it("filters by status", () => {
    expect(filterTasks(MOCK_TASKS, "running").length).toBe(1);
    expect(filterTasks(MOCK_TASKS, "queued").length).toBe(1);
    expect(filterTasks(MOCK_TASKS, "completed").length).toBe(1);
    expect(filterTasks(MOCK_TASKS, "failed").length).toBe(1);
    expect(filterTasks(MOCK_TASKS, "all").length).toBe(4);
  });

  it("formats durations", () => {
    expect(formatDuration(45000)).toBe("45s");
    expect(formatDuration(120000)).toBe("2m 0s");
    expect(formatDuration(3700000)).toBe("1h 1m");
  });

  it("returns status icons", () => {
    expect(getStatusIcon("queued")).toBe("clock");
    expect(getStatusIcon("running")).toBe("spinner");
    expect(getStatusIcon("completed")).toBe("check");
    expect(getStatusIcon("failed")).toBe("x");
  });

  it("filtered data reflects filter state", () => {
    const data = createActiveTasksData(MOCK_TASKS, "running");
    expect(data.filter).toBe("running");
    expect(data.tasks.length).toBe(1);
    expect(data.tasks[0].status).toBe("running");
  });
});

describe("BudgetSummary panel data", () => {
  it("creates overview from summary", () => {
    const overview = createBudgetOverview(MOCK_SUMMARY);
    expect(overview.todayUsd).toBe(12.5);
    expect(overview.providers.length).toBe(2);
  });

  it("handles null summary", () => {
    const overview = createBudgetOverview(null);
    expect(overview.todayUsd).toBe(0);
    expect(overview.providers).toEqual([]);
    expect(overview.alertLevel).toBe("none");
  });

  it("calculates alert levels", () => {
    expect(determineAlertLevel(9.5, 10)).toBe("critical");
    expect(determineAlertLevel(8.5, 10)).toBe("warning");
    expect(determineAlertLevel(5, 10)).toBe("none");
    expect(determineAlertLevel(10, 0)).toBe("none");
  });

  it("formats USD amounts", () => {
    expect(formatUsd(42.123)).toBe("$42.12");
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("generates SVG path from trend points", () => {
    const points = [
      { day: "2026-02-17", costUsd: 5 },
      { day: "2026-02-18", costUsd: 10 },
      { day: "2026-02-19", costUsd: 8 },
    ];
    const path = trendToSvgPath(points, 120, 32);
    expect(path).toContain("M");
    expect(path).toContain("L");
  });

  it("returns empty path for no points", () => {
    expect(trendToSvgPath([], 120, 32)).toBe("");
  });

  it("includes provider breakdown with percentages", () => {
    const overview = createBudgetOverview(MOCK_SUMMARY);
    const anthropic = overview.providers.find((p) => p.name === "Anthropic");
    expect(anthropic).toBeDefined();
    expect(anthropic!.costUsd).toBe(8.0);
    expect(anthropic!.percentage).toBe(64);
  });
});
