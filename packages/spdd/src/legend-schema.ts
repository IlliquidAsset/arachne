import { z } from "zod"

export const LegendSchema = z.object({
  partA: z.string().min(1),
  partB0: z.string().min(1),
  partB: z.string().min(1),
  partC: z.string().min(1),
  partD: z.string().min(1),
  personalityQuickReference: z.string().min(1),
  appendix: z.string().optional(),
})

export type Legend = z.infer<typeof LegendSchema>
