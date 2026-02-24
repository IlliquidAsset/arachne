import { z } from "zod"

const DEFAULT_IGNORE = ["node_modules", ".git", "dist", ".next", ".cache"]

export const ArachneConfigSchema = z.object({
  discovery: z
    .object({
      paths: z.array(z.string()).default([]),
      ignore: z.array(z.string()).default(DEFAULT_IGNORE),
    })
    .default({ paths: [], ignore: DEFAULT_IGNORE }),
  servers: z
    .object({
      portRange: z.tuple([z.number(), z.number()]).default([4100, 4200]),
      autoStart: z.boolean().default(true),
    })
    .default({ portRange: [4100, 4200], autoStart: true }),
  auth: z
    .object({
      apiKey: z.string().default(""),
      enabled: z.boolean().default(true),
    })
    .default({ apiKey: "", enabled: true }),
  dispatch: z
    .object({
      maxConcurrent: z.number().default(3),
      timeout: z.number().default(300000),
    })
    .default({ maxConcurrent: 3, timeout: 300000 }),
  voice: z
    .object({
      enabled: z.boolean().default(false),
      port: z.number().min(1).max(65535).default(8090),
      whisper: z
        .object({
          binaryPath: z.string().default("~/.config/arachne/whisper.cpp/build/bin/whisper-server"),
          modelPath: z.string().default("~/.config/arachne/models/ggml-large-v3-turbo.bin"),
          serverPort: z.number().min(1).max(65535).default(9000),
          language: z.string().default("en"),
          useCoreML: z.boolean().default(false),
        })
        .default({
          binaryPath: "~/.config/arachne/whisper.cpp/build/bin/whisper-server",
          modelPath: "~/.config/arachne/models/ggml-large-v3-turbo.bin",
          serverPort: 9000,
          language: "en",
          useCoreML: false,
        }),
      tts: z
        .object({
          engine: z.enum(["kokoro"]).default("kokoro"),
          voiceId: z.string().default("af_heart"),
          sampleRate: z.number().default(24000),
        })
        .default({
          engine: "kokoro",
          voiceId: "af_heart",
          sampleRate: 24000,
        }),
      vad: z
        .object({
          silenceThreshold: z.number().default(640),
        })
        .default({
          silenceThreshold: 640,
        }),
      maxConcurrentSessions: z.number().min(1).default(1),
    })
    .default({
      enabled: false,
      port: 8090,
      whisper: {
        binaryPath: "~/.config/arachne/whisper.cpp/build/bin/whisper-server",
        modelPath: "~/.config/arachne/models/ggml-large-v3-turbo.bin",
        serverPort: 9000,
        language: "en",
        useCoreML: false,
      },
      tts: {
        engine: "kokoro",
        voiceId: "af_heart",
        sampleRate: 24000,
      },
      vad: {
        silenceThreshold: 640,
      },
      maxConcurrentSessions: 1,
    }),
})

export type ArachneConfig = z.infer<typeof ArachneConfigSchema>
export type VoiceConfig = z.infer<typeof ArachneConfigSchema>["voice"]
