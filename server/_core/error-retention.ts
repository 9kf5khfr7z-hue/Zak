import { purgeResolvedErrorEvents } from "../db";

export type RetentionHeartbeatResult = {
  lastRunAt: string;
  deletedCount: number;
  status: "SUCCESS" | "FAILED";
  attempts?: number;
  error?: string;
};

export type DevelopmentRetentionScheduleOptions = {
  intervalMs?: number;
  maxRetries?: number;
  now?: () => Date;
};

let lastResult: RetentionHeartbeatResult | null = null;
let schedule: ReturnType<typeof setInterval> | null = null;
let scheduleRunning = false;

export async function runRetentionHeartbeat(now = new Date(), maxRetries = 0): Promise<RetentionHeartbeatResult> {
  const lastRunAt = now.toISOString();
  let attempts = 0;
  let lastError: unknown;

  while (attempts <= maxRetries) {
    attempts += 1;
    try {
      const deletedCount = await purgeResolvedErrorEvents(now);
      lastResult = { lastRunAt, deletedCount, status: "SUCCESS", attempts };
      return { ...lastResult };
    } catch (error) {
      lastError = error;
    }
  }

  lastResult = {
    lastRunAt,
    deletedCount: 0,
    status: "FAILED",
    attempts,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
  return { ...lastResult };
}

export function startDevelopmentRetentionSchedule(
  options: DevelopmentRetentionScheduleOptions = {},
): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development retention schedule cannot run in production");
  }
  if (schedule) return;

  const intervalMs = options.intervalMs ?? 60 * 60 * 1000;
  const maxRetries = options.maxRetries ?? 1;
  const now = options.now ?? (() => new Date());
  scheduleRunning = true;
  schedule = setInterval(() => {
    void runRetentionHeartbeat(now(), maxRetries).catch((error) => {
      console.error("[monitoring] Development retention schedule failed", error);
    });
  }, intervalMs);
}

export function stopRetentionSchedule(): void {
  if (schedule) clearInterval(schedule);
  schedule = null;
  scheduleRunning = false;
}

export function isDevelopmentRetentionScheduleRunning(): boolean {
  return scheduleRunning;
}

export function getLastRetentionHeartbeat(): RetentionHeartbeatResult | null {
  return lastResult ? { ...lastResult } : null;
}

export function resetRetentionHeartbeat(): void {
  stopRetentionSchedule();
  lastResult = null;
}
