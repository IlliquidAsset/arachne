export type Role = "dad" | "work" | "husband" | "general";

export interface RoleDetection {
  role: Role;
  confidence: number;
  signals: string[];
}

interface DetectRoleOptions {
  time?: Date;
  activeProject?: string;
  messageContent?: string;
}

type ScoreTable = Record<Role, number>;

const ROLE_PRIORITY: Role[] = ["work", "dad", "husband", "general"];
const WORK_PROJECT_KEYWORDS = ["amanda", "northstarpro", "watserface"];
const DAD_KEYWORDS = ["scarlett", "daughter", "kids"];
const HUSBAND_KEYWORDS = ["samantha", "wife", "dinner"];
const WORK_KEYWORDS = [
  "meeting",
  "deadline",
  "client",
  "project",
  "deliverable",
  "finance",
  "creative",
  "design",
  "budget",
  "email",
  "presentation",
  "roadmap",
  "ticket",
  "sprint",
  "deploy",
  "release",
];

let manualOverride: Role | null = null;

function createScoreTable(): ScoreTable {
  return {
    dad: 0,
    work: 0,
    husband: 0,
    general: 0.2,
  };
}

function addScore(scores: ScoreTable, role: Role, value: number, signal: string, signals: string[]): void {
  scores[role] += value;
  signals.push(signal);
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function addScoreSignals(scores: ScoreTable, signals: string[]): void {
  for (const role of ROLE_PRIORITY) {
    signals.push(`score:${role}=${scores[role].toFixed(2)}`);
  }
}

function selectRole(scores: ScoreTable): { role: Role; score: number } {
  let chosenRole: Role = "general";
  let chosenScore = -1;

  for (const role of ROLE_PRIORITY) {
    const score = scores[role];
    if (score > chosenScore) {
      chosenRole = role;
      chosenScore = score;
    }
  }

  return { role: chosenRole, score: chosenScore };
}

export function detectRole(opts: DetectRoleOptions = {}): RoleDetection {
  if (manualOverride !== null) {
    return {
      role: manualOverride,
      confidence: 1,
      signals: ["manual_override"],
    };
  }

  const now = opts.time ?? new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const isWeekend = day === 0 || day === 6;
  const isWeekday = !isWeekend;
  const isLateNight = hour >= 23 || hour < 6;

  const scores = createScoreTable();
  const signals: string[] = ["baseline_general_context"];

  if (isWeekday && hour >= 9 && hour < 17) {
    addScore(scores, "work", 0.7, "weekday_work_hours", signals);
  }

  if (isWeekday && hour >= 17 && hour < 21) {
    addScore(scores, "dad", 0.5, "weekday_family_time", signals);
    addScore(scores, "general", 0.3, "weekday_evening_general_context", signals);
  }

  if (isWeekday && hour >= 21 && hour < 23) {
    addScore(scores, "husband", 0.4, "weekday_partner_time", signals);
    addScore(scores, "general", 0.4, "weekday_night_general_context", signals);
  }

  if (isWeekend && hour >= 6 && hour < 21) {
    addScore(scores, "dad", 0.6, "weekend_daytime_family_time", signals);
  }

  if (isLateNight) {
    addScore(scores, "general", 0.5, "late_night_general_context", signals);
  }

  const projectName = opts.activeProject?.trim().toLowerCase();
  if (projectName && hasKeyword(projectName, WORK_PROJECT_KEYWORDS)) {
    addScore(scores, "work", 0.2, "active_work_project", signals);
  }

  const message = opts.messageContent?.trim().toLowerCase();
  if (message) {
    if (hasKeyword(message, DAD_KEYWORDS)) {
      addScore(scores, "dad", 0.3, "dad_keywords_detected", signals);
    }

    if (hasKeyword(message, HUSBAND_KEYWORDS)) {
      addScore(scores, "husband", 0.3, "husband_keywords_detected", signals);
    }

    if (hasKeyword(message, WORK_KEYWORDS)) {
      addScore(scores, "work", 0.1, "work_keywords_detected", signals);
    }
  }

  addScoreSignals(scores, signals);

  const winner = selectRole(scores);
  const totalScore = ROLE_PRIORITY.reduce((sum, role) => sum + scores[role], 0);
  const confidence = totalScore > 0 ? Number((winner.score / totalScore).toFixed(2)) : 0;

  return {
    role: winner.role,
    confidence,
    signals,
  };
}

export function setManualOverride(role: Role): void {
  manualOverride = role;
}

export function clearOverride(): void {
  manualOverride = null;
}

export function getManualOverride(): Role | null {
  return manualOverride;
}
