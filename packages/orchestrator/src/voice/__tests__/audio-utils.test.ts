import { describe, expect, test } from "bun:test"
import { float32ToPcm16, pcm16ToFloat32, pcmToWav } from "../audio-utils"

describe("pcmToWav", () => {
  test("produces buffer starting with RIFF", () => {
    const pcm = new Int16Array([0, 1024, -1024])
    const wav = pcmToWav(pcm, 16_000)

    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF")
  })

  test("has 44-byte header plus PCM payload", () => {
    const pcm = new Int16Array([1, 2, 3, 4])
    const wav = pcmToWav(pcm, 16_000)

    expect(wav.length).toBe(44 + pcm.byteLength)
  })

  test("writes sample rate from input", () => {
    const pcm = new Int16Array([0, 1, 2, 3])
    const wav = pcmToWav(pcm, 22_050)

    expect(wav.readUInt32LE(24)).toBe(22_050)
  })
})

describe("float32ToPcm16", () => {
  test("converts 0.0, 1.0, -1.0 to expected int16 values", () => {
    const pcm = float32ToPcm16(new Float32Array([0.0, 1.0, -1.0]))

    expect(Array.from(pcm)).toEqual([0, 32767, -32768])
  })

  test("clamps values outside [-1, 1]", () => {
    const pcm = float32ToPcm16(new Float32Array([1.5, -2.5]))

    expect(Array.from(pcm)).toEqual([32767, -32768])
  })
})

describe("pcm16ToFloat32", () => {
  test("scales int16 values back to float range", () => {
    const float32 = pcm16ToFloat32(new Int16Array([0, 32767, -32768]))

    expect(float32[0]).toBe(0)
    expect(float32[1]).toBeCloseTo(1, 5)
    expect(float32[2]).toBe(-1)
  })
})
