import { describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({
  listErrorEvents: vi.fn().mockResolvedValue([]),
  getErrorEventById: vi.fn().mockResolvedValue(undefined),
  updateErrorEventStatus: vi.fn().mockResolvedValue(undefined),
}));

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: AuthenticatedUser["role"] | null): TrpcContext {
  const user = role
    ? ({
        id: role === "admin" ? 1 : 2,
        openId: `${role}-test-user`,
        email: `${role}@example.com`,
        name: role === "admin" ? "Test Admin" : "Test User",
        loginMethod: "test",
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } satisfies AuthenticatedUser)
    : null;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin.errorMonitoring authorization", () => {
  it.each([
    ["anonymous", null],
    ["regular user", "user"],
    ["driver", "driver"],
  ] as const)("rejects %s from listing persisted errors", async (_label, role) => {
    const caller = appRouter.createCaller(createContext(role));

    await expect(caller.admin.errorMonitoring.list({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects non-admins from viewing an error or changing its status", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(
      caller.admin.errorMonitoring.get({ eventId: "BUG-000001" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.errorMonitoring.updateStatus({
        eventId: "BUG-000001",
        status: "ACKNOWLEDGED",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to access the monitoring procedures without touching a database", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.admin.errorMonitoring.list({ limit: 10 })).resolves.toEqual([]);
    await expect(
      caller.admin.errorMonitoring.get({ eventId: "BUG-000001" }),
    ).resolves.toBeUndefined();
    await expect(
      caller.admin.errorMonitoring.updateStatus({
        eventId: "BUG-000001",
        status: "RESOLVED",
      }),
    ).resolves.toBeUndefined();
  });
});
