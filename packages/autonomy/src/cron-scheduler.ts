const DEFAULT_TICK_INTERVAL_MS = 60_000;
const MAX_HOUR = 23;
const MAX_MINUTE = 59;

const DAILY_TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;
const DAILY_CRON_PATTERN = /^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/;

export interface ScheduledJob {
  id: string;
  workflowName: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  lastTriggered: Date | null;
  nextTrigger: Date | null;
}

export interface CronSchedulerOptions {
  tickIntervalMs?: number;
}

type JobCallback = (job: ScheduledJob) => Promise<void>;

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

type ZonedDatePart = "year" | "month" | "day" | "hour" | "minute" | "second";

function cloneJob(job: ScheduledJob): ScheduledJob {
  return {
    ...job,
    lastTriggered: job.lastTriggered ? new Date(job.lastTriggered) : null,
    nextTrigger: job.nextTrigger ? new Date(job.nextTrigger) : null,
  };
}

function validateTime(hour: number, minute: number, expression: string): void {
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > MAX_HOUR ||
    minute < 0 ||
    minute > MAX_MINUTE
  ) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }
}

function parseCronExpression(expression: string): { hour: number; minute: number } {
  const normalizedExpression = expression.trim();

  const dailyMatch = DAILY_TIME_PATTERN.exec(normalizedExpression);
  if (dailyMatch) {
    const hour = Number.parseInt(dailyMatch[1] ?? "", 10);
    const minute = Number.parseInt(dailyMatch[2] ?? "", 10);
    validateTime(hour, minute, expression);
    return { hour, minute };
  }

  const cronMatch = DAILY_CRON_PATTERN.exec(normalizedExpression);
  if (cronMatch) {
    const minute = Number.parseInt(cronMatch[1] ?? "", 10);
    const hour = Number.parseInt(cronMatch[2] ?? "", 10);
    validateTime(hour, minute, expression);
    return { hour, minute };
  }

  throw new Error(`Unsupported cron expression: ${expression}`);
}

function readDatePart(parts: Intl.DateTimeFormatPart[], partType: ZonedDatePart): number {
  const value = parts.find((part) => part.type === partType)?.value;
  if (!value) {
    throw new Error(`Unable to read ${partType} for timezone calculation`);
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) {
    throw new Error(`Invalid ${partType} value: ${value}`);
  }

  return parsedValue;
}

function getZonedDateParts(date: Date, timezone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  return {
    year: readDatePart(parts, "year"),
    month: readDatePart(parts, "month"),
    day: readDatePart(parts, "day"),
    hour: readDatePart(parts, "hour"),
    minute: readDatePart(parts, "minute"),
    second: readDatePart(parts, "second"),
  };
}

function getTimeZoneOffsetMs(date: Date, timezone: string): number {
  const zoned = getZonedDateParts(date, timezone);
  const zonedAsUtcMs = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  return zonedAsUtcMs - date.getTime();
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  const firstOffsetMs = getTimeZoneOffsetMs(utcGuess, timezone);
  const firstCandidate = new Date(utcGuess.getTime() - firstOffsetMs);

  const refinedOffsetMs = getTimeZoneOffsetMs(firstCandidate, timezone);
  if (refinedOffsetMs !== firstOffsetMs) {
    return new Date(utcGuess.getTime() - refinedOffsetMs);
  }

  return firstCandidate;
}

function addDays(
  year: number,
  month: number,
  day: number,
  daysToAdd: number,
): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(year, month - 1, day + daysToAdd));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function calculateNextTrigger(hour: number, minute: number, timezone: string): Date {
  const now = new Date();
  const zonedNow = getZonedDateParts(now, timezone);

  let nextTrigger = zonedDateTimeToUtc(
    zonedNow.year,
    zonedNow.month,
    zonedNow.day,
    hour,
    minute,
    timezone,
  );

  if (nextTrigger.getTime() <= now.getTime()) {
    const tomorrow = addDays(zonedNow.year, zonedNow.month, zonedNow.day, 1);
    nextTrigger = zonedDateTimeToUtc(
      tomorrow.year,
      tomorrow.month,
      tomorrow.day,
      hour,
      minute,
      timezone,
    );
  }

  return nextTrigger;
}

export class CronScheduler {
  private readonly tickIntervalMs: number;
  private readonly jobs: Map<string, ScheduledJob>;
  private tickHandle: ReturnType<typeof setInterval> | null;
  private callback: JobCallback | null;

  constructor(options?: CronSchedulerOptions) {
    this.tickIntervalMs = options?.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS;
    this.jobs = new Map<string, ScheduledJob>();
    this.tickHandle = null;
    this.callback = null;
  }

  register(job: Omit<ScheduledJob, "id" | "lastTriggered" | "nextTrigger">): string {
    const id = crypto.randomUUID();
    const { hour, minute } = parseCronExpression(job.cronExpression);

    const scheduledJob: ScheduledJob = {
      ...job,
      id,
      lastTriggered: null,
      nextTrigger: calculateNextTrigger(hour, minute, job.timezone),
    };

    this.jobs.set(id, scheduledJob);
    return id;
  }

  unregister(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  start(onTrigger: JobCallback): void {
    this.callback = onTrigger;

    if (this.tickHandle) {
      clearInterval(this.tickHandle);
    }

    this.tickHandle = setInterval(() => {
      this.runTick();
    }, this.tickIntervalMs);
  }

  stop(): void {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
    }

    this.tickHandle = null;
    this.callback = null;
  }

  listJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(cloneJob);
  }

  getJob(jobId: string): ScheduledJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    return cloneJob(job);
  }

  private runTick(): void {
    const callback = this.callback;
    if (!callback) return;

    const now = new Date();

    for (const job of this.jobs.values()) {
      if (!job.enabled || !job.nextTrigger) continue;
      if (job.nextTrigger.getTime() > now.getTime()) continue;

      callback(cloneJob(job)).catch((error: unknown) => {
        console.error(`CronScheduler job ${job.id} failed`, error);
      });

      job.lastTriggered = new Date(now);

      const { hour, minute } = parseCronExpression(job.cronExpression);
      job.nextTrigger = calculateNextTrigger(hour, minute, job.timezone);
    }
  }
}
