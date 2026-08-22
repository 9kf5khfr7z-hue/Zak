import { beforeEach, describe, expect, it } from "vitest";
import { createDemoOrder, getDemoOrder, getDemoOrders, resetDemoOrders, startDemoDispatch, transitionDemoOrder } from "../lib/demo-orders";

beforeEach(async () => {
  await resetDemoOrders();
});

describe("orders-history-mock.test.ts", () => {
  it("records a timeline for every state transition", async () => {
    let order = await createDemoOrder();
    order = await startDemoDispatch(order.id);
    for (const status of ["DRIVER_ACCEPTED", "DRIVER_ARRIVED", "PICKED_UP", "IN_DELIVERY", "DELIVERED"] as const) {
      order = await transitionDemoOrder(order.id, status, "driver");
    }
    expect(order.history.map((item) => item.status)).toEqual([
      "PENDING", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "DRIVER_ARRIVED", "PICKED_UP", "IN_DELIVERY", "DELIVERED",
    ]);
    expect(order.history.every((item) => item.at && item.actor)).toBe(true);
  });

  it("keeps histories and lookups isolated per order", async () => {
    const first = await createDemoOrder({ customerName: "أحمد", total: 20 });
    const second = await createDemoOrder({ customerName: "سارة", total: 40 });
    await startDemoDispatch(first.id);
    const storedFirst = await getDemoOrder(first.id);
    const storedSecond = await getDemoOrder(second.id);
    expect(storedFirst?.history.map((item) => item.status)).toEqual(["PENDING", "SEARCHING_DRIVER", "DRIVER_ASSIGNED"]);
    expect(storedSecond?.history).toHaveLength(1);
    expect(storedSecond?.status).toBe("PENDING");
    expect((await getDemoOrders()).map((item) => item.id)).toEqual([second.id, first.id]);
  });

  it("blocks two concurrent trips for the same demo driver", async () => {
    const first = await createDemoOrder();
    const second = await createDemoOrder();
    const results = await Promise.allSettled([startDemoDispatch(first.id), startDemoDispatch(second.id)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await getDemoOrders()).filter((item) => item.driverId === "driver-demo-001")).toHaveLength(1);
  });
});
