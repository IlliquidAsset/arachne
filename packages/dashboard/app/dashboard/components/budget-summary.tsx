"use client";

import { useList } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createBudgetOverview,
  trendToSvgPath,
  formatUsd,
  determineAlertLevel,
} from "@arachne/web/src/components/BudgetSummary";
import type { SpendingSummary } from "@arachne/web/src/api/types";
import type { BudgetOverview } from "@arachne/web/src/components/BudgetSummary";

const ALERT_STYLES: Record<BudgetOverview["alertLevel"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  none: { variant: "secondary", label: "On Track" },
  warning: { variant: "outline", label: "Warning" },
  critical: { variant: "destructive", label: "Over Budget" },
};

function TrendSparkline({ overview }: { overview: BudgetOverview }) {
  if (overview.trendPoints.length < 2) return null;

  const width = 120;
  const height = 32;
  const path = trendToSvgPath(overview.trendPoints, width, height);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-primary"
      aria-label="Spending trend"
    >
      <title>Spending trend</title>
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProviderBreakdown({ overview }: { overview: BudgetOverview }) {
  if (overview.providers.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {overview.providers.map((p) => (
        <div key={p.name} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{p.name}</span>
            <span className="text-foreground font-medium">
              {formatUsd(p.costUsd)} ({p.percentage}%)
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${p.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BudgetSummary() {
  const { query, result } = useList<SpendingSummary>({
    resource: "budget",
  });

  const summary = result.data?.[0] ?? null;
  const overview = createBudgetOverview(summary);
  const alertInfo = ALERT_STYLES[overview.alertLevel];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Budget Summary
          </CardTitle>
          <Badge variant={alertInfo.variant} className="text-[10px]">
            {alertInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Loading...
          </p>
        )}
        {query.isError && (
          <p className="text-xs text-destructive">
            Failed to load budget data
          </p>
        )}
        {!query.isLoading && !query.isError && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">
                  {formatUsd(overview.todayUsd)}
                </p>
                <p className="text-[10px] text-muted-foreground">Today</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {formatUsd(overview.weekUsd)}
                </p>
                <p className="text-[10px] text-muted-foreground">Week</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {formatUsd(overview.monthUsd)}
                </p>
                <p className="text-[10px] text-muted-foreground">Month</p>
              </div>
            </div>

            <div className="flex justify-center">
              <TrendSparkline overview={overview} />
            </div>

            <ProviderBreakdown overview={overview} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
