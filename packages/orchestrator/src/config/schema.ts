import { z } from "zod"

const DEFAULT_IGNORE = ["node_modules", ".git", "dist", ".next", ".cache"]

export const AmandaConfigSchema = z.object({
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
})

export type AmandaConfig = z.infer<typeof AmandaConfigSchema>
