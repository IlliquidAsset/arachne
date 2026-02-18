import { describe, expect, it } from "bun:test";
import { classify } from "../classifier.js";

describe("classify", () => {
  it("routes daily grok to deterministic workflow track", () => {
    const result = classify("run daily grok now");

    expect(result.track).toBe("deterministic");
    expect(result.workflow?.name).toBe("daily-grok");
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.agent).toBeUndefined();
  });

  it("routes brainstorming tasks to Muse on llm track", () => {
    const result = classify("brainstorm ideas for alternative launch positioning");

    expect(result.track).toBe("llm");
    expect(result.agent?.name).toBe("muse");
    expect(result.workflow).toBeUndefined();
  });

  it("routes debugging tasks to Sisyphus on llm track", () => {
    const result = classify("debug React rendering issue in dashboard");

    expect(result.track).toBe("llm");
    expect(result.agent?.name).toBe("sisyphus");
    expect(result.workflow).toBeUndefined();
  });
});
