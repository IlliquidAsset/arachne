import { describe, it, expect } from "bun:test";
import { NoOpVoiceProvider, createVoiceAdapter } from "../voice-adapter.js";
import type { VoiceProvider } from "@arachne/shared";

describe("NoOpVoiceProvider", () => {
  it("should be instantiable", () => {
    const provider = new NoOpVoiceProvider();
    expect(provider).toBeDefined();
  });

  it("isAvailable should return false", () => {
    const provider = new NoOpVoiceProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it("listen should return an empty async generator", async () => {
    const provider = new NoOpVoiceProvider();
    const generator = provider.listen();

    const result = await generator.next();
    expect(result.done).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it("speak should be a no-op", async () => {
    const provider = new NoOpVoiceProvider();
    await expect(
      provider.speak({
        text: "hello",
        voice: "default",
        priority: "immediate",
      })
    ).resolves.toBeUndefined();
  });

  it("shutdown should be a no-op", async () => {
    const provider = new NoOpVoiceProvider();
    await expect(provider.shutdown()).resolves.toBeUndefined();
  });

  it("should implement VoiceProvider interface", () => {
    const provider = new NoOpVoiceProvider();
    const voiceProvider: VoiceProvider = provider;

    expect(voiceProvider.isAvailable).toBeDefined();
    expect(voiceProvider.listen).toBeDefined();
    expect(voiceProvider.speak).toBeDefined();
    expect(voiceProvider.shutdown).toBeDefined();
  });
});

describe("createVoiceAdapter factory", () => {
  it("should return a VoiceProvider instance", () => {
    const adapter = createVoiceAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.isAvailable).toBeDefined();
    expect(adapter.listen).toBeDefined();
    expect(adapter.speak).toBeDefined();
    expect(adapter.shutdown).toBeDefined();
  });

  it("should return a NoOpVoiceProvider", () => {
    const adapter = createVoiceAdapter();
    expect(adapter).toBeInstanceOf(NoOpVoiceProvider);
  });

  it("should create independent instances", () => {
    const adapter1 = createVoiceAdapter();
    const adapter2 = createVoiceAdapter();
    expect(adapter1).not.toBe(adapter2);
  });

  it("returned adapter should have isAvailable returning false", () => {
    const adapter = createVoiceAdapter();
    expect(adapter.isAvailable()).toBe(false);
  });
});
