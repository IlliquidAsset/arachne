const WAV_HEADER_BYTES = 44
const PCM_FORMAT = 1
const MONO_CHANNELS = 1
const BITS_PER_SAMPLE = 16
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8

export function pcmToWav(pcm: Int16Array, sampleRate: number): Buffer {
  const dataSize = pcm.byteLength
  const wav = Buffer.alloc(WAV_HEADER_BYTES + dataSize)

  wav.write("RIFF", 0, 4, "ascii")
  wav.writeUInt32LE(36 + dataSize, 4)
  wav.write("WAVE", 8, 4, "ascii")

  wav.write("fmt ", 12, 4, "ascii")
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(PCM_FORMAT, 20)
  wav.writeUInt16LE(MONO_CHANNELS, 22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(sampleRate * MONO_CHANNELS * BYTES_PER_SAMPLE, 28)
  wav.writeUInt16LE(MONO_CHANNELS * BYTES_PER_SAMPLE, 32)
  wav.writeUInt16LE(BITS_PER_SAMPLE, 34)

  wav.write("data", 36, 4, "ascii")
  wav.writeUInt32LE(dataSize, 40)

  const payload = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  payload.copy(wav, WAV_HEADER_BYTES)

  return wav
}

export function float32ToPcm16(float32: Float32Array): Int16Array {
  const pcm = new Int16Array(float32.length)

  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i] ?? 0))
    if (clamped < 0) {
      pcm[i] = Math.round(clamped * 32768)
    } else {
      pcm[i] = Math.round(clamped * 32767)
    }
  }

  return pcm
}

export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length)

  for (let i = 0; i < pcm16.length; i++) {
    const sample = pcm16[i] ?? 0
    if (sample < 0) {
      float32[i] = sample / 32768
    } else {
      float32[i] = sample / 32767
    }
  }

  return float32
}
