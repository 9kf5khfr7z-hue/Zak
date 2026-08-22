import { beforeEach, describe, expect, it } from "vitest";
import { canTransition, getAllowedTransitions } from "../shared/order-state";
import { chargeMockPayment, requestMockOtp, sendMockWhatsApp } from "../lib/providers/mock";
import { createDemoOrder, getDemoActiveDriverOrder, resetDemoOrders, startDemoDispatch, transitionDemoOrder } from "../lib/demo-orders";

beforeEach(async () => {
  await resetDemoOrders();
});

describe("Phase 2 canonical state machine", () => {
  it("allows the happy path only in order", () => {
    expect(canTransition("PENDING", "SEARCHING_DRIVER", "system")).toBe(true);
    expect(canTransition("SEARCHING_DRIVER", "DRIVER_ASSIGNED", "system")).toBe(true);
    expect(canTransition("DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "driver")).toBe(true);
    expect(canTransition("DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "customer")).toBe(false);
    expect(getAllowedTransitions("DELIVERED")).toEqual([]);
  });

  it("allows cancellation and failure only from non-terminal permitted states", () => {
    expect(canTransition("DRIVER_ACCEPTED", "CANCELLED", "driver")).toBe(true);
    expect(canTransition("IN_DELIVERY", "FAILED", "system")).toBe(true);
    expect(canTransition("DELIVERED", "CANCELLED", "admin")).toBe(false);
    expect(canTransition("IN_DELIVERY", "FAILED", "customer")).toBe(false);
  });
});

describe("Phase 2 local demo order", () => {
  it("creates and dispatches a demo order with history", async () => {
    const created = await createDemoOrder();
    const dispatched = await startDemoDispatch(created.id);
    expect(dispatched.status).toBe("DRIVER_ASSIGNED");
    expect(dispatched.driverId).toBe("driver-demo-001");
    expect(dispatched.history.map((item) => item.status)).toEqual(["PENDING", "SEARCHING_DRIVER", "DRIVER_ASSIGNED"]);
    expect((await getDemoActiveDriverOrder())?.id).toBe(created.id);
  });

  it("rejects a driver update before assignment", async () => {
    const created = await createDemoOrder();
    await expect(transitionDemoOrder(created.id, "DRIVER_ACCEPTED", "driver")).rejects.toThrow("Illegal order transition");
  });
});

describe("Phase 2 mock providers", () => {
  it("never calls an external provider", async () => {
    expect((await requestMockOtp("+218000000000")).code).toBe("123456");
    expect((await chargeMockPayment(10, "ZAK-D1")).provider).toBe("mock");
    expect((await sendMockWhatsApp("+218000000000", "test")).provider).toBe("mock");
  });
});
