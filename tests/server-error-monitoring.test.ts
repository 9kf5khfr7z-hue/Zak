import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { upsertErrorEvent, purgeResolvedErrorEvents } = vi.hoisted(() => ({
  upsertErrorEvent: vi.fn(),
  purgeResolvedErrorEvents: vi.fn(),
}));

vi.mock("../server/db", () => ({
  upsertErrorEvent,
  purgeResolvedErrorEvents,
}));

import {
  captureServerIncident,
  getServerMonitoringSnapshot,
  resetServerMonitoring,
  ingestServerIncident,
} from "../server/_core/error-monitoring";
import { mockPushProvider, ProductionPushProvider, resetPushProvider } from "../server/_core/push-provider";
import {
  getLastRetentionHeartbeat,
  isDevelopmentRetentionScheduleRunning,
  resetRetentionHeartbeat,
  runRetentionHeartbeat,
  startDevelopmentRetentionSchedule,
  stopRetentionSchedule,
} from "../server/_core/error-retention";

async function flushPersistence() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("server error monitoring persistence", () => {
  beforeEach(() => {
    resetServerMonitoring();
    upsertErrorEvent.mockReset();
    upsertErrorEvent.mockResolvedValue(undefined);
    purgeResolvedErrorEvents.mockResolvedValue(0);
    resetPushProvider();
    resetRetentionHeartbeat();
    vi.stubEnv("NODE_ENV", "development");
  });

  it("persists a server incident and aggregates repeated errors within the dedupe window", async () => {
    const first = captureServerIncident({
      error: new Error("Database timeout for order 123"),
      source: "GET /orders",
      kind: "DB_ERROR",
      severity: "CRITICAL",
    });
    const second = captureServerIncident({
      error: new Error("Database timeout for order 456"),
      source: "GET /orders",
      kind: "DB_ERROR",
      severity: "CRITICAL",
    });

    await flushPersistence();

    expect(second.id).toBe(first.id);
    expect(getServerMonitoringSnapshot().incidents[0]).toMatchObject({
      occurrenceCount: 2,
      severity: "CRITICAL",
    });
    expect(upsertErrorEvent).toHaveBeenCalledTimes(2);
    expect(upsertErrorEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        eventId: first.id,
        occurrenceCount: 1,
        affectedUsers: 1,
        message: "Database timeout for order 123",
      }),
    );
  });

  it("keeps the Development memory incident when persistent storage is unavailable", async () => {
    upsertErrorEvent.mockRejectedValue(new Error("development database unavailable"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const incident = captureServerIncident({
      error: "Development storage unavailable",
      source: "server",
      kind: "STORAGE_ERROR",
      severity: "HIGH",
    });

    await flushPersistence();

    expect(getServerMonitoringSnapshot().incidents).toEqual([expect.objectContaining({ id: incident.id })]);
    expect(warning).toHaveBeenCalledWith(
      "[monitoring] Using Development memory fallback",
      expect.any(Error),
    );
    warning.mockRestore();
  });

  it("redacts sensitive ingest fields and ignores client-controlled status or roles", () => {
    const incident = ingestServerIncident({
      message: "failed password=secret token=abc123",
      source: "mobile checkout",
      severity: "NOT_ALLOWED",
      stackTrace: "Authorization: Bearer secret-cookie",
      statusCode: 200,
      status: "RESOLVED",
      role: "admin",
    } as Record<string, unknown>);

    expect(incident.severity).toBe("MEDIUM");
    expect(incident.message).not.toContain("secret");
    expect(incident.message).toContain("[REDACTED]");
    expect(incident.stackTrace).not.toContain("secret-cookie");
    expect(incident.statusCode).toBe(200);
    expect(incident.resolved).toBe(false);
    expect(incident).not.toHaveProperty("status");
    expect(incident).not.toHaveProperty("role");
  });

  it("sends only HIGH and CRITICAL alerts and deduplicates repeated alerts", () => {
    captureServerIncident({ error: "low", source: "test", kind: "LOW_CASE", severity: "LOW" });
    captureServerIncident({ error: "medium", source: "test", kind: "MEDIUM_CASE", severity: "MEDIUM" });
    captureServerIncident({ error: "high", source: "test", kind: "HIGH_CASE", severity: "HIGH" });
    captureServerIncident({ error: "high", source: "test", kind: "HIGH_CASE", severity: "HIGH" });
    captureServerIncident({ error: "critical", source: "test", kind: "CRITICAL_CASE", severity: "CRITICAL" });

    expect(mockPushProvider.getAlerts()).toHaveLength(2);
    expect(mockPushProvider.getAlerts().map((alert) => alert.severity).sort()).toEqual(["CRITICAL", "HIGH"]);
  });

  it("runs retention and records a deterministic heartbeat result", async () => {
    purgeResolvedErrorEvents.mockResolvedValue(7);
    const now = new Date("2026-08-24T10:00:00.000Z");

    const result = await runRetentionHeartbeat(now);

    expect(purgeResolvedErrorEvents).toHaveBeenCalledWith(now);
    expect(result).toMatchObject({ lastRunAt: now.toISOString(), deletedCount: 7, status: "SUCCESS", attempts: 1 });
    expect(result.runId).toMatch(/^retention-\d+-\d+$/);
    expect(result.startedAt).toBe(now.toISOString());
    expect(result.finishedAt).toBeTruthy();
    expect(getLastRetentionHeartbeat()).toEqual(result);
  });

  it("reports retention failures without throwing", async () => {
    purgeResolvedErrorEvents.mockRejectedValue(new Error("table unavailable"));

    const result = await runRetentionHeartbeat(new Date("2026-08-24T11:00:00.000Z"));

    expect(result.status).toBe("FAILED");
    expect(result.deletedCount).toBe(0);
    expect(result.error).toBe("table unavailable");
  });

  it("does not silently use the Development fallback in Production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    upsertErrorEvent.mockRejectedValue(new Error("database unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    captureServerIncident({
      error: "Production storage unavailable",
      source: "server",
      kind: "STORAGE_ERROR",
      severity: "CRITICAL",
    });

    await flushPersistence();

    expect(error).toHaveBeenCalledWith(
      "[monitoring] Failed to persist server incident",
      expect.any(Error),
    );
    expect(getServerMonitoringSnapshot().incidents).toHaveLength(1);
    error.mockRestore();
  });
});


describe("pre-production retention and push hardening", () => {
  beforeEach(() => {
    resetRetentionHeartbeat();
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    stopRetentionSchedule();
  });

  it("starts and stops the Development retention schedule", async () => {
    purgeResolvedErrorEvents.mockResolvedValue(2);
    startDevelopmentRetentionSchedule({ intervalMs: 5, maxRetries: 1 });
    expect(isDevelopmentRetentionScheduleRunning()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(purgeResolvedErrorEvents).toHaveBeenCalled();
    stopRetentionSchedule();
    expect(isDevelopmentRetentionScheduleRunning()).toBe(false);
  });

  it("retries a failed retention run and records the successful attempt", async () => {
    purgeResolvedErrorEvents
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(4);
    const result = await runRetentionHeartbeat(new Date("2026-08-24T12:00:00.000Z"), 1);
    expect(result).toMatchObject({ status: "SUCCESS", deletedCount: 4, attempts: 2 });
  });

  it("keeps ProductionPushProvider dormant until explicitly enabled", async () => {
    const provider = new ProductionPushProvider({ endpoint: "https://push.invalid", token: "do-not-log" });
    await expect(provider.send({
      incidentId: "incident-1",
      severity: "CRITICAL",
      title: "Critical",
      content: "Test",
      createdAt: new Date().toISOString(),
    })).rejects.toThrow("not enabled");
  });

  it("rate-limits repeated production push alerts without making a second request", async () => {
    const requests: unknown[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      requests.push(init?.body);
      return new Response(null, { status: 202 });
    }) as typeof fetch;
    try {
      const provider = new ProductionPushProvider({
        endpoint: "https://push.invalid",
        token: "test-token",
        enabled: true,
        rateLimitMs: 60_000,
      });
      const alert = {
        incidentId: "incident-rate-limit",
        severity: "HIGH" as const,
        title: "High",
        content: "Test",
        createdAt: new Date().toISOString(),
      };
      await provider.send(alert);
      await provider.send(alert);
      expect(requests).toHaveLength(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
