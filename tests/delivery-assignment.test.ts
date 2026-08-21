import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => { storage.set(key, value); },
    removeItem: async (key: string) => { storage.delete(key); },
    clear: async () => { storage.clear(); },
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { acceptDriverOrder, createOrder, getNearbyDriverOrders, rejectDriverOrder } from "../lib/orders";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("driver delivery assignment", () => {
  it("allows one active restaurant order and blocks a second one", async () => {
    const first = await createOrder({ total: 30, payment: "cash", note: "", address: "طرابلس", storeName: "مطعم واحد" });
    const second = await createOrder({ total: 20, payment: "cash", note: "", address: "طرابلس", storeName: "مطعم ثاني" });
    const available = await getNearbyDriverOrders("driver-local");
    expect(available.map((order) => order.id)).toEqual(expect.arrayContaining([first.id, second.id]));
    expect(await acceptDriverOrder(first.id, "driver-local")).not.toBeNull();
    expect(await acceptDriverOrder(second.id, "driver-local")).toBeNull();
  });

  it("records a rejection without assigning the order", async () => {
    const order = await createOrder({ total: 18, payment: "cash", note: "", address: "طرابلس", storeName: "متجر قريب" });
    const rejected = await rejectDriverOrder(order.id, "driver-local");
    expect(rejected?.assignment?.status).toBe("rejected");
  });
});
