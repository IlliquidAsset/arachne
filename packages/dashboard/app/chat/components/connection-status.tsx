"use client";
import { useConnectionStatus } from "@/app/hooks/use-connection-status";

const STATUS_CONFIG = {
  connected: {
    dot: "bg-emerald-500",
    text: "Connected"
  },
  connecting: {
    dot: "bg-amber-500 animate-pulse",
    text: "Connecting..."
  },
  disconnected: {
    dot: "bg-red-500",
    text: "Disconnected"
  }
} as const;

export function ConnectionStatus() {
  const { status } = useConnectionStatus();
  const config = STATUS_CONFIG[status];
  
  return (
    <div 
      className="flex items-center gap-2 text-xs text-muted-foreground"
      data-testid="connection-status"
    >
      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
      {status !== "connected" && <span>{config.text}</span>}
    </div>
  );
}
