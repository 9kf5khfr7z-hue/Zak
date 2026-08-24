import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const retentionMock = vi.hoisted(() => ({
  purgeResolvedErrorEvents: vi.fn(),
}));

vi.mock("../server/db", () => retentionMock);

import {
  getLastRetentionHeartbeat,
  resetRetentionHeartbeat,
  runRetentionHeartbeat,
  startDevelopmentRetentionSchedule,
  stopRetentionSchedule,
} from "../server/_core/error-retention";
import {
  ProductionPushProvider,
  validateProductionPushConfig,
} from "../server/_core/push-provider";

describe("Phase 3D security and production readiness", () => {
  beforeEach(() => {
    retentionMock.purgeResolvedErrorEvents.mockReset();
    resetRetentionHeartbeat();
  });

  afterEach(() => {
    stopRetentionSchedule();
    vi.useRealTimers();
  });

  it("runs multiple isolated development retention cycles and preserves the latest heartbeat", async () => {
    retentionMock.purgeResolvedErrorEvents
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const cycle1 = await runRetentionHeartbeat(new Date("2026-08-24T10:00:00.000Z"));
    const cycle2 = await runRetentionHeartbeat(new Date("2026-08-24T10:05:00.000Z"));
    const cycle3 = await runRetentionHeartbeat(new Date("2026-08-24T10:10:00.000Z"));

    expect([cycle1.deletedCount, cycle2.deletedCount, cycle3.deletedCount]).toEqual([2, 0, 1]);
    expect(cycle1.status).toBe("SUCCESS");
    expect(cycle2.status).toBe("SUCCESS");
    expect(cycle3.status).toBe("SUCCESS");
    expect(retentionMock.purgeResolvedErrorEvents).toHaveBeenCalledTimes(3);
    expect(getLastRetentionHeartbeat()).toMatchObject({
      lastRunAt: "2026-08-24T10:10:00.000Z",
      deletedCount: 1,
      status: "SUCCESS",
    });
  });

  it("retries a failed retention cycle and allows the next cycle to run", async () => {
    retentionMock.purgeResolvedErrorEvents
      .mockRejectedValueOnce(new Error("temporary storage failure"))
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);

    const retried = await runRetentionHeartbeat(new Date("2026-08-24T11:00:00.000Z"), 1);
    const nextCycle = await runRetentionHeartbeat(new Date("2026-08-24T11:05:00.000Z"), 1);

    expect(retried).toMatchObject({ status: "SUCCESS", deletedCount: 3, attempts: 2 });
    expect(nextCycle).toMatchObject({ status: "SUCCESS", deletedCount: 0, attempts: 1 });
    expect(getLastRetentionHeartbeat()?.status).toBe("SUCCESS");
  });

  it("keeps the retention schedule Development-only", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => startDevelopmentRetentionSchedule({ intervalMs: 1 })).toThrow(
      "Development retention schedule cannot run in production",
    );
    vi.unstubAllEnvs();
  });

  it("requires HTTPS and secrets when ProductionPushProvider is enabled", () => {
    expect(() => validateProductionPushConfig({ enabled: true, endpoint: "http://push.local", token: "secret" })).toThrow(
      "endpoint must use HTTPS",
    );
    expect(() => validateProductionPushConfig({ enabled: true, endpoint: "https://push.example.test", token: "" })).toThrow(
      "requires endpoint and token secrets",
    );
    expect(() => new ProductionPushProvider({ enabled: false, endpoint: "", token: "" })).not.toThrow();
  });
});
