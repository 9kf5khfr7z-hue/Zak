import { beforeEach, describe, expect, it, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDemoOrder, getDemoActiveDriverOrder, getDemoOrder, getDemoOrders, resetDemoOrders, startDemoDispatch, transitionDemoOrder } from "../lib/demo-orders";

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

  it("requires assignment before driver acceptance", async () => {
    const order = await createDemoOrder();
    await expect(transitionDemoOrder(order.id, "DRIVER_ACCEPTED", "driver")).rejects.toThrow("Illegal order transition");

    const assigned = await startDemoDispatch(order.id);
    const accepted = await transitionDemoOrder(assigned.id, "DRIVER_ACCEPTED", "driver");
    expect(accepted.status).toBe("DRIVER_ACCEPTED");
    expect(accepted.history.map((item) => item.status)).toEqual([
      "PENDING", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ACCEPTED",
    ]);
  });

  it("blocks two concurrent trips for the same demo driver", async () => {
    const first = await createDemoOrder();
    const second = await createDemoOrder();
    const results = await Promise.allSettled([startDemoDispatch(first.id), startDemoDispatch(second.id)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await getDemoOrders()).filter((item) => item.driverId === "driver-demo-001")).toHaveLength(1);
  });

  it("clears legacy Demo storage and allows a fresh dispatch", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => { storage.set(key, value); },
        removeItem: (key: string) => { storage.delete(key); },
        clear: () => { storage.clear(); },
        key: (index: number) => [...storage.keys()][index] ?? null,
        get length() { return storage.size; },
      },
    });

    try {
      const order = await createDemoOrder();
      await startDemoDispatch(order.id);
      await AsyncStorage.setItem("zak_demo_orders_legacy", JSON.stringify([{ ...order, driverId: "driver-demo-001", status: "IN_DELIVERY" }]));

      await resetDemoOrders();

      expect(await getDemoOrders()).toEqual([]);
      expect(await getDemoActiveDriverOrder()).toBeNull();
      expect((await AsyncStorage.getAllKeys()).filter((key) => key.startsWith("zak_demo") || key.startsWith("demo_"))).toEqual([]);

      const fresh = await createDemoOrder();
      await expect(startDemoDispatch(fresh.id)).resolves.toMatchObject({ id: fresh.id, status: "DRIVER_ASSIGNED" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not allow a dispatch write to reappear after a concurrent reset", async () => {
    const order = await createDemoOrder();
    const resetPromise = resetDemoOrders();
    const dispatchPromise = startDemoDispatch(order.id);

    await resetPromise;
    await expect(dispatchPromise).rejects.toThrow("Demo order not found");
    expect(await getDemoOrders()).toEqual([]);
  });
});
