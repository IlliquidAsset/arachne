export type AgentEntry = {
  name: string;
  specialty: string;
  whenToInvoke: string[];
  defaultModel?: string;
};

export interface AgentRoster {
  getAgent(name: string): AgentEntry | null;
  listAgents(): AgentEntry[];
  selectAgent(taskDescription: string): AgentEntry | null;
}

const AGENTS: AgentEntry[] = [
  {
    name: "prometheus",
    specialty: "planning",
    whenToInvoke: ["plan", "strategy", "architecture", "design"],
  },
  {
    name: "sisyphus",
    specialty: "execution",
    whenToInvoke: ["implement", "build", "execute", "code", "fix", "debug"],
  },
  {
    name: "muse",
    specialty: "creative/divergent",
    whenToInvoke: [
      "brainstorm",
      "creative",
      "ideas",
      "alternative",
      "explore options",
    ],
  },
  {
    name: "devils-advocate",
    specialty: "critical analysis",
    whenToInvoke: [
      "critique",
      "stress test",
      "adversarial",
      "challenge",
      "review critically",
    ],
  },
  {
    name: "oracle",
    specialty: "strategic evaluation",
    whenToInvoke: ["architecture decision", "tradeoff", "long-term", "evaluate"],
  },
  {
    name: "metis",
    specialty: "gap analysis",
    whenToInvoke: ["gaps", "missing", "pre-plan", "what am I missing"],
  },
  {
    name: "momus",
    specialty: "verification",
    whenToInvoke: ["verify", "review plan", "check accuracy", "validate"],
  },
  {
    name: "atlas",
    specialty: "knowledge management",
    whenToInvoke: ["knowledge", "document", "catalog"],
  },
  {
    name: "explore",
    specialty: "codebase investigation",
    whenToInvoke: ["find", "search codebase", "how does", "where is"],
  },
  {
    name: "librarian",
    specialty: "external research",
    whenToInvoke: ["docs", "best practice", "library", "how do others"],
  },
];

const AGENT_ALIASES = new Map<string, string>([["da", "devils-advocate"]]);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function cloneAgent(agent: AgentEntry): AgentEntry {
  return {
    ...agent,
    whenToInvoke: [...agent.whenToInvoke],
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreAgent(agent: AgentEntry, taskLower: string): number {
  let score = 0;
  for (const keyword of agent.whenToInvoke) {
    const normalizedKeyword = keyword.toLowerCase();
    if (normalizedKeyword.includes(" ")) {
      if (taskLower.includes(normalizedKeyword)) {
        score += 2;
      }
      continue;
    }

    const pattern = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, "i");
    if (pattern.test(taskLower)) {
      score += 1;
    }
  }
  return score;
}

export function selectAgent(taskDescription: string): AgentEntry | null {
  const normalizedTask = normalize(taskDescription);
  if (!normalizedTask) return null;

  let bestAgent: AgentEntry | null = null;
  let bestScore = 0;

  for (const agent of AGENTS) {
    const score = scoreAgent(agent, normalizedTask);
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }

  return bestAgent ? cloneAgent(bestAgent) : null;
}

export function getAgent(name: string): AgentEntry | null {
  const normalizedName = normalize(name);
  if (!normalizedName) return null;

  const resolvedName = AGENT_ALIASES.get(normalizedName) ?? normalizedName;
  const agent = AGENTS.find((entry) => entry.name === resolvedName);
  return agent ? cloneAgent(agent) : null;
}

export function listAgents(): AgentEntry[] {
  return AGENTS.map(cloneAgent);
}

export const agentRoster: AgentRoster = {
  getAgent,
  listAgents,
  selectAgent,
};
