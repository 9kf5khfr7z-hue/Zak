import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsertErrorEvent } = vi.hoisted(() => ({
  upsertErrorEvent: vi.fn(),
}));

vi.mock("../server/db", () => ({
  upsertErrorEvent,
}));

import {
  captureServerIncident,
  getServerMonitoringSnapshot,
  resetServerMonitoring,
} from "../server/_core/error-monitoring";

async function flushPersistence() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("server error monitoring persistence", () => {
  beforeEach(() => {
    resetServerMonitoring();
    upsertErrorEvent.mockReset();
    upsertErrorEvent.mockResolvedValue(undefined);
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
