/**
 * Budget alert system.
 * Configurable threshold-based alerts for spending monitoring.
 * No enforcement (hard halt) — that's a separate safety module.
 */

export interface AlertThreshold {
  level: "warning" | "critical";
  percentOfBudget: number;
  dailyBudgetUsd: number;
}

export interface Alert {
  level: "warning" | "critical";
  message: string;
  currentSpend: number;
  threshold: number;
  timestamp: Date;
}

export interface AlertChannel {
  send(alert: Alert): void;
}

/**
 * Check current spend against configured thresholds.
 * Returns all triggered alerts, sorted by level (warning first, critical second).
 */
export function checkAlerts(
  currentSpend: number,
  thresholds: AlertThreshold[]
): Alert[] {
  const alerts: Alert[] = [];

  for (const t of thresholds) {
    const thresholdUsd = (t.percentOfBudget / 100) * t.dailyBudgetUsd;

    if (currentSpend >= thresholdUsd) {
      const percentUsed = t.dailyBudgetUsd > 0
        ? Math.round((currentSpend / t.dailyBudgetUsd) * 100)
        : 100;

      alerts.push({
        level: t.level,
        message: `Budget ${t.level}: ${percentUsed}% of daily budget used ($${currentSpend.toFixed(2)}/$${t.dailyBudgetUsd.toFixed(2)})`,
        currentSpend,
        threshold: thresholdUsd,
        timestamp: new Date(),
      });
    }
  }

  // Sort: warning first, then critical
  return alerts.sort((a, b) => {
    if (a.level === b.level) return 0;
    return a.level === "warning" ? -1 : 1;
  });
}

/**
 * Default alert channel: logs to console.
 * Warning → console.warn, Critical → console.error.
 */
export class LogAlertChannel implements AlertChannel {
  send(alert: Alert): void {
    const prefix = `[BUDGET ${alert.level.toUpperCase()}]`;
    if (alert.level === "critical") {
      console.error(`${prefix} ${alert.message}`);
    } else {
      console.warn(`${prefix} ${alert.message}`);
    }
  }
}
