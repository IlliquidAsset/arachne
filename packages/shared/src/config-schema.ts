import { z } from "zod/v4";

const DEFAULT_PORTS = { web: 3100, voice: 8090 } as const;
const DEFAULT_PATHS = {
  db: "~/.config/arachne/arachne.db",
  skills: "~/.config/opencode/skills/",
} as const;
const DEFAULT_PROVIDERS = {
  anthropic: { envVar: "ANTHROPIC_API_KEY" },
  xai: { envVar: "XAI_API_KEY" },
  runpod: { envVar: "RUNPOD_API_KEY" },
} as const;
const DEFAULT_FEATURES = { voice: false, web: true, autonomy: true } as const;

const ProviderConfigSchema = z.object({
  envVar: z.string(),
});

const PortsSchema = z.object({
  web: z.number().default(DEFAULT_PORTS.web),
  voice: z.number().default(DEFAULT_PORTS.voice),
}).default({ ...DEFAULT_PORTS });

const PathsSchema = z.object({
  db: z.string().default(DEFAULT_PATHS.db),
  skills: z.string().default(DEFAULT_PATHS.skills),
}).default({ ...DEFAULT_PATHS });

const ProvidersSchema = z.record(z.string(), ProviderConfigSchema).default({
  ...DEFAULT_PROVIDERS,
});

const FeaturesSchema = z.object({
  voice: z.boolean().default(DEFAULT_FEATURES.voice),
  web: z.boolean().default(DEFAULT_FEATURES.web),
  autonomy: z.boolean().default(DEFAULT_FEATURES.autonomy),
}).default({ ...DEFAULT_FEATURES });

export const ArachneGlobalConfigSchema = z.object({
  ports: PortsSchema,
  paths: PathsSchema,
  providers: ProvidersSchema,
  features: FeaturesSchema,
});

export type ArachneGlobalConfig = z.infer<typeof ArachneGlobalConfigSchema>;

const ServiceEntrySchema = z.object({
  name: z.string(),
  type: z.enum(["opencode", "runpod", "api"]),
  url: z.string(),
  status: z.enum(["active", "inactive"]),
  discoveredAt: z.string(),
  lastChecked: z.string(),
});

export type ServiceEntry = z.infer<typeof ServiceEntrySchema>;

export const ServicesRegistrySchema = z.object({
  services: z.array(ServiceEntrySchema).default([]),
});

export type ServicesRegistry = z.infer<typeof ServicesRegistrySchema>;
