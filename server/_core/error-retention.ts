import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { purgeResolvedErrorEvents } from "../db";

export type RetentionHeartbeatResult = {
  runId: string;
  startedAt: string;
  finishedAt: string;
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

const statePath = process.env.ERROR_RETENTION_STATE_PATH ?? join(process.cwd(), ".runtime", "error-retention-state.json");
let lastResult: RetentionHeartbeatResult | null = null;
let schedule: ReturnType<typeof setInterval> | null = null;
let scheduleRunning = false;
let runSequence = 0;

async function persistResult(result: RetentionHeartbeatResult): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(result, null, 2), "utf8");
}

export async function loadPersistedRetentionHeartbeat(): Promise<RetentionHeartbeatResult | null> {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const parsed = JSON.parse(await readFile(statePath, "utf8")) as RetentionHeartbeatResult;
    if (!parsed.runId || !parsed.startedAt || !parsed.finishedAt || !parsed.status) return null;
    lastResult = parsed;
    return { ...parsed };
  } catch {
    return null;
  }
}

export async function runRetentionHeartbeat(now = new Date(), maxRetries = 0): Promise<RetentionHeartbeatResult> {
  const runId = `retention-${Date.now()}-${++runSequence}`;
  const startedAt = now.toISOString();
  let attempts = 0;
  let lastError: unknown;

  while (attempts <= maxRetries) {
    attempts += 1;
    try {
      const deletedCount = await purgeResolvedErrorEvents(now);
      const result: RetentionHeartbeatResult = {
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        lastRunAt: startedAt,
        deletedCount,
        status: "SUCCESS",
        attempts,
      };
      lastResult = result;
      await persistResult(result);
      return { ...result };
    } catch (error) {
      lastError = error;
    }
  }

  const result: RetentionHeartbeatResult = {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    lastRunAt: startedAt,
    deletedCount: 0,
    status: "FAILED",
    attempts,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
  lastResult = result;
  await persistResult(result);
  return { ...result };
}

export function startDevelopmentRetentionSchedule(options: DevelopmentRetentionScheduleOptions = {}): void {
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
      console.error("[monitoring] Development retention schedule failed", error instanceof Error ? error.message : "unknown");
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
