"use client";

import { useList } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createTokenRibbonData,
  formatCost,
  formatTokenCount,
  getUsageLevel,
} from "@arachne/web/src/components/TokenRibbon";
import type { SpendingSummary } from "@arachne/web/src/api/types";
import type { ProviderBar } from "@arachne/web/src/components/TokenRibbon";
import { useState } from "react";

const LEVEL_COLORS: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

const LEVEL_BG: Record<string, string> = {
  green: "bg-emerald-500/20",
  yellow: "bg-amber-500/20",
  red: "bg-red-500/20",
};

function ProviderBarRow({ bar }: { bar: ProviderBar }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{bar.name}</span>
        <span className="text-muted-foreground">
          {formatTokenCount(bar.tokensUsed)} / {formatTokenCount(bar.tokenLimit)}
        </span>
      </div>
      <div className={`h-2 rounded-full ${LEVEL_BG[bar.level]}`}>
        <div
          className={`h-full rounded-full transition-all ${LEVEL_COLORS[bar.level]}`}
          style={{ width: `${bar.percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{bar.percentage}%</span>
        <span>{formatCost(bar.costUsd)}</span>
      </div>
    </div>
  );
}

export function TokenRibbon() {
  const [collapsed, setCollapsed] = useState(false);
  const { query, result } = useList<SpendingSummary>({
    resource: "budget",
  });

  const summary = result.data?.[0] ?? null;
  const ribbonData = createTokenRibbonData(summary, collapsed);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Token Usage
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">
              {formatCost(ribbonData.totalCostUsd)}
            </span>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground text-xs"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? "+" : "-"}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Loading...
          </p>
        )}
        {query.isError && (
          <p className="text-xs text-destructive">Failed to load token data</p>
        )}
        {!query.isLoading && !query.isError && !collapsed && (
          <div className="space-y-3">
            {ribbonData.providers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No usage data</p>
            ) : (
              ribbonData.providers.map((bar) => (
                <ProviderBarRow key={bar.name} bar={bar} />
              ))
            )}
          </div>
        )}
        {!query.isLoading && !query.isError && collapsed && (
          <div className="flex gap-2 flex-wrap">
            {ribbonData.providers.map((bar) => (
              <Badge
                key={bar.name}
                variant="secondary"
                className="text-xs"
              >
                {bar.name}: {bar.percentage}%
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
