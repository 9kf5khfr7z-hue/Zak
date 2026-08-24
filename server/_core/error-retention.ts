import { purgeResolvedErrorEvents } from "../db";

export type RetentionHeartbeatResult = {
  lastRunAt: string;
  deletedCount: number;
  status: "SUCCESS" | "FAILED";
  error?: string;
};

let lastResult: RetentionHeartbeatResult | null = null;

export async function runRetentionHeartbeat(now = new Date()): Promise<RetentionHeartbeatResult> {
  const lastRunAt = now.toISOString();
  try {
    const deletedCount = await purgeResolvedErrorEvents(now);
    lastResult = { lastRunAt, deletedCount, status: "SUCCESS" };
  } catch (error) {
    lastResult = {
      lastRunAt,
      deletedCount: 0,
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error),
    };
  }
  return { ...lastResult };
}

export function getLastRetentionHeartbeat(): RetentionHeartbeatResult | null {
  return lastResult ? { ...lastResult } : null;
}

export function resetRetentionHeartbeat(): void {
  lastResult = null;
}
