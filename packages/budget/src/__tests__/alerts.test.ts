import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  checkAlerts,
  LogAlertChannel,
  type Alert,
  type AlertThreshold,
  type AlertChannel,
} from "../alerts";

describe("alerts", () => {
  describe("checkAlerts", () => {
    const defaultThresholds: AlertThreshold[] = [
      { level: "warning", percentOfBudget: 80, dailyBudgetUsd: 10 },
      { level: "critical", percentOfBudget: 100, dailyBudgetUsd: 10 },
    ];

    it("returns no alerts when spend is below all thresholds", () => {
      const alerts = checkAlerts(5.0, defaultThresholds);
      expect(alerts).toEqual([]);
    });

    it("returns warning alert at 80% of daily budget", () => {
      const alerts = checkAlerts(8.5, defaultThresholds);
      expect(alerts.length).toBe(1);
      expect(alerts[0].level).toBe("warning");
      expect(alerts[0].currentSpend).toBe(8.5);
      expect(alerts[0].threshold).toBe(8); // 80% of $10
      expect(alerts[0].message).toContain("warning");
    });

    it("returns both warning and critical at 100%+", () => {
      const alerts = checkAlerts(10.5, defaultThresholds);
      expect(alerts.length).toBe(2);
      expect(alerts[0].level).toBe("warning");
      expect(alerts[1].level).toBe("critical");
    });

    it("returns critical alert at exactly 100% of budget", () => {
      const alerts = checkAlerts(10.0, defaultThresholds);
      const critical = alerts.find((a) => a.level === "critical");
      expect(critical).toBeDefined();
      expect(critical!.threshold).toBe(10); // 100% of $10
    });

    it("includes timestamp on alerts", () => {
      const alerts = checkAlerts(9.0, defaultThresholds);
      expect(alerts.length).toBe(1);
      expect(alerts[0].timestamp).toBeInstanceOf(Date);
    });

    it("handles custom thresholds", () => {
      const custom: AlertThreshold[] = [
        { level: "warning", percentOfBudget: 50, dailyBudgetUsd: 20 },
      ];
      const alerts = checkAlerts(11.0, custom);
      expect(alerts.length).toBe(1);
      expect(alerts[0].threshold).toBe(10); // 50% of $20
    });

    it("handles empty thresholds array", () => {
      const alerts = checkAlerts(100.0, []);
      expect(alerts).toEqual([]);
    });

    it("handles zero budget gracefully", () => {
      const thresholds: AlertThreshold[] = [
        { level: "critical", percentOfBudget: 100, dailyBudgetUsd: 0 },
      ];
      // $0 budget means any spend triggers
      const alerts = checkAlerts(0.01, thresholds);
      expect(alerts.length).toBe(1);
    });
  });

  describe("LogAlertChannel", () => {
    it("implements AlertChannel interface", () => {
      const channel = new LogAlertChannel();
      expect(typeof channel.send).toBe("function");
    });

    it("logs alert to console", () => {
      const originalWarn = console.warn;
      const calls: any[] = [];
      console.warn = (...args: any[]) => calls.push(args);

      const channel = new LogAlertChannel();
      const alert: Alert = {
        level: "warning",
        message: "Budget warning: 85% used",
        currentSpend: 8.5,
        threshold: 8,
        timestamp: new Date("2025-02-18T12:00:00Z"),
      };
      channel.send(alert);

      expect(calls.length).toBe(1);
      expect(calls[0][0]).toContain("BUDGET");

      console.warn = originalWarn;
    });

    it("uses console.error for critical alerts", () => {
      const originalError = console.error;
      const calls: any[] = [];
      console.error = (...args: any[]) => calls.push(args);

      const channel = new LogAlertChannel();
      const alert: Alert = {
        level: "critical",
        message: "Budget critical: 105% used",
        currentSpend: 10.5,
        threshold: 10,
        timestamp: new Date("2025-02-18T12:00:00Z"),
      };
      channel.send(alert);

      expect(calls.length).toBe(1);
      expect(calls[0][0]).toContain("BUDGET");

      console.error = originalError;
    });
  });

  describe("AlertChannel interface", () => {
    it("supports custom channel implementations", () => {
      const sent: Alert[] = [];
      const customChannel: AlertChannel = {
        send(alert: Alert) {
          sent.push(alert);
        },
      };

      const alert: Alert = {
        level: "warning",
        message: "test",
        currentSpend: 5,
        threshold: 4,
        timestamp: new Date(),
      };

      customChannel.send(alert);
      expect(sent.length).toBe(1);
      expect(sent[0]).toBe(alert);
    });
  });
});
