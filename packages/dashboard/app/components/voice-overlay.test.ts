import { describe, it, expect } from "bun:test";

describe("VoiceOverlay state logic", () => {
  const STATE_LABELS: Record<string, string> = {
    idle: "Ready",
    connecting: "Connecting...",
    connected: "Connected",
    listening: "Listening...",
    processing: "Processing...",
    thinking: "Thinking...",
    speaking: "Speaking...",
    error: "Error",
  };

  const CONNECTION_DOT: Record<string, string> = {
    disconnected: "bg-red-500",
    connecting: "bg-amber-500 animate-pulse",
    connected: "bg-emerald-500",
  };

  it("maps all voice states to labels", () => {
    const states = [
      "idle",
      "connecting",
      "connected",
      "listening",
      "processing",
      "thinking",
      "speaking",
      "error",
    ];
    for (const s of states) {
      expect(STATE_LABELS[s]).toBeDefined();
      expect(STATE_LABELS[s].length).toBeGreaterThan(0);
    }
  });

  it("maps all connection states to dot colors", () => {
    const states = ["disconnected", "connecting", "connected"];
    for (const s of states) {
      expect(CONNECTION_DOT[s]).toBeDefined();
      expect(CONNECTION_DOT[s]).toContain("bg-");
    }
  });

  it("connecting state includes pulse animation", () => {
    expect(CONNECTION_DOT.connecting).toContain("animate-pulse");
  });

  it("disconnected uses red, connected uses emerald", () => {
    expect(CONNECTION_DOT.disconnected).toContain("red");
    expect(CONNECTION_DOT.connected).toContain("emerald");
  });
});

describe("VoiceOverlay orb classes", () => {
  function orbClasses(
    state: string,
    isMuted: boolean,
  ): string {
    const base =
      "w-32 h-32 rounded-full border-2 transition-all duration-500 flex items-center justify-center";
    if (isMuted) return `${base} border-red-500/50 bg-red-500/10 opacity-50`;
    switch (state) {
      case "listening":
        return `${base} border-indigo-500 bg-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.3)] animate-[pulse-orb_2s_ease-in-out_infinite]`;
      case "processing":
      case "thinking":
        return `${base} border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(234,179,8,0.2)] animate-spin-slow`;
      case "speaking":
        return `${base} border-indigo-500 bg-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.4)] scale-110`;
      case "error":
        return `${base} border-red-500 bg-red-500/10`;
      default:
        return `${base} border-border bg-card`;
    }
  }

  it("returns muted style when muted", () => {
    const cls = orbClasses("listening", true);
    expect(cls).toContain("opacity-50");
    expect(cls).toContain("border-red-500/50");
  });

  it("listening state has pulse animation", () => {
    const cls = orbClasses("listening", false);
    expect(cls).toContain("pulse-orb");
    expect(cls).toContain("border-indigo-500");
  });

  it("processing and thinking share spin animation", () => {
    const proc = orbClasses("processing", false);
    const think = orbClasses("thinking", false);
    expect(proc).toContain("animate-spin-slow");
    expect(think).toContain("animate-spin-slow");
    expect(proc).toContain("border-amber-500");
  });

  it("speaking state scales up", () => {
    const cls = orbClasses("speaking", false);
    expect(cls).toContain("scale-110");
    expect(cls).toContain("border-indigo-500");
  });

  it("error state uses red border", () => {
    const cls = orbClasses("error", false);
    expect(cls).toContain("border-red-500");
  });

  it("idle state uses default border", () => {
    const cls = orbClasses("idle", false);
    expect(cls).toContain("border-border");
    expect(cls).toContain("bg-card");
  });
});
