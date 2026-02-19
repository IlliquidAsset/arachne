"use client";

import { useList } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createServiceGridData,
  formatLastChecked,
} from "@arachne/web/src/components/ServiceStatus";
import type { ServiceInfo } from "@arachne/web/src/api/types";
import type { ServiceCard, StatusColor } from "@arachne/web/src/components/ServiceStatus";

const STATUS_DOT: Record<StatusColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  grey: "bg-muted-foreground/50",
};

const STATUS_LABEL: Record<StatusColor, string> = {
  green: "Active",
  yellow: "Degraded",
  red: "Offline",
  grey: "Stale",
};

function ServiceItem({ card }: { card: ServiceCard }) {
  const now = Date.now();

  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[card.status]}`}
        role="img"
        aria-label={STATUS_LABEL[card.status]}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {card.name}
          </span>
          {card.isStale && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              stale
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {card.type} &middot; {formatLastChecked(card.lastChecked, now)}
        </span>
      </div>
    </div>
  );
}

export function ServiceStatus() {
  const { query, result } = useList<ServiceInfo>({
    resource: "services",
  });

  const services = result.data ?? [];
  const gridData = createServiceGridData(services);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Service Status
          </CardTitle>
          <div className="flex gap-2 text-xs">
            <span className="text-emerald-500 font-medium">
              {gridData.activeCount} active
            </span>
            {gridData.offlineCount > 0 && (
              <span className="text-red-500 font-medium">
                {gridData.offlineCount} down
              </span>
            )}
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
          <p className="text-xs text-destructive">
            Failed to load service status
          </p>
        )}
        {!query.isLoading && !query.isError && (
          <div className="divide-y divide-border">
            {gridData.services.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No services registered
              </p>
            ) : (
              gridData.services.map((card) => (
                <ServiceItem key={`${card.name}-${card.type}`} card={card} />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
