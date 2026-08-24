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

import { getDriverRating, getDriverRatingStats, resetDriverRatings, submitDriverRating } from "../lib/driver-ratings";

beforeEach(async () => {
  storage.clear();
  await resetDriverRatings();
});

describe("driver ratings", () => {
  it("allows the customer to rate a delivered trip and persists it", async () => {
    const saved = await submitDriverRating({
      orderId: "order-1",
      driverId: "driver-1",
      orderStatus: "delivered",
      rating: 5,
      comment: "توصيل ممتاز",
    });

    expect(saved).toMatchObject({ orderId: "order-1", driverId: "driver-1", rating: 5, comment: "توصيل ممتاز" });
    await expect(getDriverRating("order-1")).resolves.toMatchObject({ rating: 5 });
  });

  it("rejects ratings before the trip is delivered or outside one to five stars", async () => {
    await expect(submitDriverRating({ orderId: "order-2", driverId: "driver-1", orderStatus: "on_the_way", rating: 5 })).rejects.toThrow("قبل اكتمال الرحلة");
    await expect(submitDriverRating({ orderId: "order-3", driverId: "driver-1", orderStatus: "delivered", rating: 0 })).rejects.toThrow("من نجمة إلى خمس نجوم");
    await expect(submitDriverRating({ orderId: "order-4", driverId: "driver-1", orderStatus: "delivered", rating: 6 })).rejects.toThrow("من نجمة إلى خمس نجوم");
  });

  it("calculates the average rating and total rating count for the admin dashboard", async () => {
    await submitDriverRating({ orderId: "order-6", driverId: "driver-1", orderStatus: "delivered", rating: 5 });
    await submitDriverRating({ orderId: "order-7", driverId: "driver-2", orderStatus: "delivered", rating: 3 });

    await expect(getDriverRatingStats()).resolves.toEqual({ average: 4, count: 2 });
  });

  it("returns zero metrics when there are no ratings", async () => {
    await expect(getDriverRatingStats()).resolves.toEqual({ average: 0, count: 0 });
  });

  it("prevents a customer from submitting a second rating for the same trip", async () => {
    const input = { orderId: "order-5", driverId: "driver-1", orderStatus: "delivered", rating: 4 } as const;
    await submitDriverRating(input);
    await expect(submitDriverRating({ ...input, rating: 3 })).rejects.toThrow("تم تقييم هذه الرحلة من قبل");
  });
});
