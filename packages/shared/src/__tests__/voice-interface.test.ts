import { describe, it, expect } from "bun:test";
import type {
  VoiceInput,
  VoiceOutput,
  VoiceProvider,
  VoiceStatus,
} from "../voice-interface.js";

describe("VoiceInput type", () => {
  it("should have required properties", () => {
    const input: VoiceInput = {
      text: "hello world",
      confidence: 0.95,
      timestamp: new Date(),
      source: "microphone",
    };

    expect(input.text).toBe("hello world");
    expect(input.confidence).toBe(0.95);
    expect(input.source).toBe("microphone");
  });

  it("should accept file source", () => {
    const input: VoiceInput = {
      text: "test",
      confidence: 0.8,
      timestamp: new Date(),
      source: "file",
    };

    expect(input.source).toBe("file");
  });
});

describe("VoiceOutput type", () => {
  it("should have required properties", () => {
    const output: VoiceOutput = {
      text: "hello user",
      voice: "default",
      priority: "immediate",
    };

    expect(output.text).toBe("hello user");
    expect(output.voice).toBe("default");
    expect(output.priority).toBe("immediate");
  });

  it("should accept queued priority", () => {
    const output: VoiceOutput = {
      text: "test",
      voice: "voice-1",
      priority: "queued",
    };

    expect(output.priority).toBe("queued");
  });
});

describe("VoiceStatus type", () => {
  it("should have required properties", () => {
    const status: VoiceStatus = {
      connected: true,
      provider: "default-provider",
    };

    expect(status.connected).toBe(true);
    expect(status.provider).toBe("default-provider");
  });

  it("should have optional timestamp properties", () => {
    const now = new Date();
    const status: VoiceStatus = {
      connected: true,
      provider: "test-provider",
      lastInput: now,
      lastOutput: now,
    };

    expect(status.lastInput).toEqual(now);
    expect(status.lastOutput).toEqual(now);
  });
});

describe("VoiceProvider interface", () => {
  it("should define listen method returning AsyncGenerator", async () => {
    const mockProvider: VoiceProvider = {
      async *listen() {
        yield {
          text: "test",
          confidence: 0.9,
          timestamp: new Date(),
          source: "microphone",
        };
      },
      async speak() {},
      isAvailable() {
        return true;
      },
      async shutdown() {},
    };

    const input = await mockProvider.listen().next();
    expect(input.done).toBe(false);
    expect(input.value?.text).toBe("test");
  });

  it("should define speak method", async () => {
    let spokenText = "";
    const mockProvider: VoiceProvider = {
      async *listen() {},
      async speak(output) {
        spokenText = output.text;
      },
      isAvailable() {
        return true;
      },
      async shutdown() {},
    };

    await mockProvider.speak({
      text: "hello",
      voice: "default",
      priority: "immediate",
    });

    expect(spokenText).toBe("hello");
  });

  it("should define isAvailable method", () => {
    const mockProvider: VoiceProvider = {
      async *listen() {},
      async speak() {},
      isAvailable() {
        return false;
      },
      async shutdown() {},
    };

    expect(mockProvider.isAvailable()).toBe(false);
  });

  it("should define shutdown method", async () => {
    let shutdownCalled = false;
    const mockProvider: VoiceProvider = {
      async *listen() {},
      async speak() {},
      isAvailable() {
        return true;
      },
      async shutdown() {
        shutdownCalled = true;
      },
    };

    await mockProvider.shutdown();
    expect(shutdownCalled).toBe(true);
  });
});
